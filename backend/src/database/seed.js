import pool from '../config/database.js';
import bcrypt from 'bcrypt';

const seedDatabase = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Hash default password
    const defaultPassword = await bcrypt.hash('password123', 10);

    // Insert contact information
    const contactResult = await client.query(`
      INSERT INTO contact_information (phone, email, address)
      VALUES 
        ('+37060012345', 'admin@vgtu.lt', 'Saulėtekio al. 11, Vilnius'),
        ('+37060054321', 'dorm1@vgtu.lt', 'Saulėtekio al. 39, Vilnius'),
        ('+37060098765', 'student1@vgtu.lt', 'Vilnius, Lithuania'),
        ('+37060011111', 'student2@vgtu.lt', 'Kaunas, Lithuania'),
        ('+37060022222', 'supervisor@vgtu.lt', 'Vilnius, Lithuania'),
        ('+37060033333', 'student3@vgtu.lt', 'Vilnius, Lithuania')
      RETURNING id;
    `);

    const contactIds = contactResult.rows.map(row => row.id);

    // Insert users
    const userResult = await client.query(`
      INSERT INTO users (first_name, last_name, email, password_hash, user_type, contact_id, faculty, study_program, student_id)
      VALUES 
        ('Jonas', 'Adminas', 'admin@vgtu.lt', $1, 'UNIVERSITY_ADMIN', $2, NULL, NULL, NULL),
        ('Petras', 'Bendrabutis', 'dorm1@vgtu.lt', $1, 'DORMITORY_ADMIN', $3, NULL, NULL, NULL),
        ('Vilius', 'Ničiperovičius', 'student1@vgtu.lt', $1, 'STUDENT', $4, 'Fundamentinių mokslų', 'Informacinės sistemos', 'S22001'),
        ('Augustas', 'Česnavičius', 'student2@vgtu.lt', $1, 'STUDENT', $5, 'Fundamentinių mokslų', 'Informacinės sistemos', 'S22002'),
        ('Martynas', 'Budintis', 'supervisor@vgtu.lt', $1, 'SUPERVISOR', $6, NULL, NULL, NULL),
        ('Tomas', 'Testas', 'student3@vgtu.lt', $1, 'STUDENT', $7, 'Fundamentinių mokslų', 'Informacinės sistemos', 'S22003')
      RETURNING id;
    `, [defaultPassword, contactIds[0], contactIds[1], contactIds[2], contactIds[3], contactIds[4], contactIds[5]]);

    const userIds = userResult.rows.map(row => row.id);

    // Insert dormitories
    const dormResult = await client.query(`
      INSERT INTO dormitories (name, address, contact_id, admin_id, total_rooms, available_rooms)
      VALUES 
        ('VGTU Bendrabutis Nr. 1', 'Saulėtekio al. 39, Vilnius', $1, $2, 8, 5),
        ('VGTU Bendrabutis Nr. 2', 'Saulėtekio al. 41, Vilnius', $1, $2, 0, 0),
        ('VGTU Bendrabutis Nr. 3', 'Saulėtekio al. 60, Vilnius', $1, $2, 0, 0)
      RETURNING id;
    `, [contactIds[1], userIds[1]]);

    const dormIds = dormResult.rows.map(row => row.id);

    // Insert rooms
    // Užtikrinti, kad occupied_beds atitinka realias sutartis
    const roomResult = await client.query(`
      INSERT INTO rooms (dormitory_id, room_number, floor, capacity, occupied_beds, price, room_type, status, description, amenities)
      VALUES 
        -- Kambarys 101: Vilius gyvena (1 ACTIVE sutartis)
        ($1, '101', 1, 1, 1, 150.00, 'Vienvietis', 'OCCUPIED', 'Jaukus vienvietis kambarys su baldais', ARRAY['Wi-Fi', 'Baldai', 'Šaldytuvas']),
        
        -- Kambarys 102: 2 vietos, 1 SIGNED sutartis (Augustas), 1 PENDING apžiūra (Tomas)
        ($1, '102', 1, 2, 0, 140.00, 'Dvivietis', 'AVAILABLE', 'Šviesus kambarys su vaizdu į kiemą', ARRAY['Wi-Fi', 'Baldai', 'Dušas']),
        
        -- Kambarys 201: visiškai laisvas, 1 APPROVED apžiūra
        ($1, '201', 2, 3, 0, 120.00, 'Trivietis', 'AVAILABLE', 'Erdvus trivietis kambarys', ARRAY['Wi-Fi', 'Baldai', 'Šaldytuvas', 'Mikrobangų krosnelė']),
        
        -- Kambarys 202: visiškai laisvas
        ($1, '202', 2, 2, 0, 150.00, 'Dvivietis', 'AVAILABLE', 'Laisvas kambarys', ARRAY['Wi-Fi', 'Baldai']),
        
        -- Kambarys 301: visiškai laisvas
        ($1, '301', 3, 2, 0, 160.00, 'Dvivietis', 'AVAILABLE', 'Naujai renovuotas kambarys', ARRAY['Wi-Fi', 'Baldai', 'Šaldytuvas', 'Kondicionierius']),
        
        -- Kambarys 302: visiškai laisvas
        ($1, '302', 3, 3, 0, 130.00, 'Trivietis', 'AVAILABLE', 'Didelis kambarys su puikiu vaizdu', ARRAY['Wi-Fi', 'Baldai', 'Šaldytuvas']),
        
        -- Kambarys 401: visiškai laisvas
        ($1, '401', 4, 2, 0, 160.00, 'Dvivietis', 'AVAILABLE', 'Kambarys ketvirtame aukšte', ARRAY['Wi-Fi', 'Baldai']),
        
        -- Kambarys 501: visiškai laisvas
        ($1, '501', 5, 2, 0, 170.00, 'Dvivietis', 'AVAILABLE', 'Premium kambarys aukštame aukšte', ARRAY['Wi-Fi', 'Baldai', 'Šaldytuvas', 'Kondicionierius', 'Balkonas'])
      RETURNING id;
    `, [dormIds[0]]);

    const roomIds = roomResult.rows.map(row => row.id);

    // Contracts
    // 1) Vilius (student1) - ACTIVE sutartis kambaryje 101
    const seqRes1 = await client.query(`SELECT nextval('contract_sequence') AS seq`);
    const seq1 = seqRes1.rows[0].seq;
    const contractNumber1 = `CNT-${String(seq1).padStart(4, '0')}`;

    await client.query(`
      INSERT INTO contracts (student_id, room_id, contract_number, start_date, end_date, monthly_price, status, signed_at)
      VALUES 
        ($1, $2, $3, '2025-09-01', '2026-06-30', 150.00, 'ACTIVE', CURRENT_TIMESTAMP)
    `, [userIds[2], roomIds[0], contractNumber1]);

    // 2) Augustas (student2) - SIGNED sutartis kambaryje 102 (laukia admin patvirtinimo)
    const seqRes2 = await client.query(`SELECT nextval('contract_sequence') AS seq`);
    const seq2 = seqRes2.rows[0].seq;
    const contractNumber2 = `CNT-${String(seq2).padStart(4, '0')}`;

    await client.query(`
      INSERT INTO contracts (student_id, room_id, contract_number, start_date, end_date, monthly_price, status, signed_at)
      VALUES 
        ($1, $2, $3, '2025-09-01', '2026-06-30', 140.00, 'SIGNED', CURRENT_TIMESTAMP)
    `, [userIds[3], roomIds[1], contractNumber2]);

    // Inspections
    // 1) Tomas (student3) - PENDING apžiūra kambaryje 201 (rezervuoja dar 1 vietą)
    await client.query(`
      INSERT INTO inspections (room_id, student_id, supervisor_id, inspection_date, inspection_time, status, resident_will_attend)
      VALUES 
        ($1, $2, $3, '2025-12-20', '14:00:00', 'PENDING', NULL),
        (2, 4, 5, '2025-11-25', '15:00:00', 'APPROVED', NULL)
    `, [roomIds[2], userIds[5], userIds[4]]);

    // Atnaujiname student1 kontaktinę informaciją su bendrabučio adresu
    await client.query(`
      UPDATE contact_information
      SET address = $1
      WHERE id = $2
    `, ['Saulėtekio al. 39, Vilnius', contactIds[2]]);

    // Atnaujiname student2 kontaktinę informaciją su bendrabučio adresu (nors sutartis dar SIGNED)
    await client.query(`
      UPDATE contact_information
      SET address = $1
      WHERE id = $2
    `, [null, contactIds[3]]);

    await client.query('COMMIT');
    console.log('Database seeded successfully!');
   
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run seed
seedDatabase()
  .then(() => {
    console.log('Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });