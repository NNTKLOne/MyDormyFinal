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
        ('+37060022222', 'supervisor@vgtu.lt', 'Vilnius, Lithuania')
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
        ('Martynas', 'Budintis', 'supervisor@vgtu.lt', $1, 'SUPERVISOR', $6, NULL, NULL, NULL)
      RETURNING id;
    `, [defaultPassword, contactIds[0], contactIds[1], contactIds[2], contactIds[3], contactIds[4]]);

    const userIds = userResult.rows.map(row => row.id);

    // Insert dormitories
    const dormResult = await client.query(`
      INSERT INTO dormitories (name, address, contact_id, admin_id, total_rooms, available_rooms)
      VALUES 
        ('VGTU Bendrabutis Nr. 1', 'Saulėtekio al. 39, Vilnius', $1, $2, 120, 45),
        ('VGTU Bendrabutis Nr. 2', 'Saulėtekio al. 41, Vilnius', $1, $2, 100, 30)
      RETURNING id;
    `, [contactIds[1], userIds[1]]);

    const dormIds = dormResult.rows.map(row => row.id);

    // Insert rooms
    const roomResult = await client.query(`
      INSERT INTO rooms (dormitory_id, room_number, floor, capacity, occupied_beds, price, room_type, status, description, amenities)
      VALUES 
        ($1, '101', 1, 2, 0, 150.00, 'Dvivietis', 'AVAILABLE', 'Jaukus dvivietis kambarys su baldais', ARRAY['Wi-Fi', 'Baldai', 'Šaldytuvas']),
        ($1, '102', 1, 2, 1, 150.00, 'Dvivietis', 'AVAILABLE', 'Šviesus kambarys su vaizdu į kiemą', ARRAY['Wi-Fi', 'Baldai', 'Duš as']),
        ($1, '201', 2, 3, 0, 120.00, 'Trivietis', 'AVAILABLE', 'Erdvus trivietis kambarys', ARRAY['Wi-Fi', 'Baldai', 'Šaldytuvas', 'Mikrobangų krosnelė']),
        ($1, '202', 2, 2, 2, 150.00, 'Dvivietis', 'OCCUPIED', 'Kambarys užimtas', ARRAY['Wi-Fi', 'Baldai']),
        ($2, '101', 1, 2, 0, 160.00, 'Dvivietis', 'AVAILABLE', 'Naujai renovuotas kambarys', ARRAY['Wi-Fi', 'Baldai', 'Šaldytuvas', 'Kondicionierius']),
        ($2, '102', 1, 3, 1, 130.00, 'Trivietis', 'AVAILABLE', 'Didelis kambarys su puikiu vaizdu', ARRAY['Wi-Fi', 'Baldai', 'Šaldytuvas']),
        ($2, '201', 2, 2, 0, 160.00, 'Dvivietis', 'RESERVED', 'Rezervuotas kambarys', ARRAY['Wi-Fi', 'Baldai']),
        ($2, '301', 3, 2, 0, 170.00, 'Dvivietis', 'AVAILABLE', 'Premium kambarys aukštame aukšte', ARRAY['Wi-Fi', 'Baldai', 'Šaldytuvas', 'Kondicionierius', 'Balkonas'])
      RETURNING id;
    `, [dormIds[0], dormIds[1]]);

    const roomIds = roomResult.rows.map(row => row.id);

    const contractResult = await client.query(`
      INSERT INTO contracts (student_id, room_id, contract_number, start_date, end_date, monthly_price, status, signed_at)
      VALUES 
        ($1, $2, 'CNT-0001', '2025-09-01', '2026-06-30', 150.00, 'ACTIVE', CURRENT_TIMESTAMP)
      RETURNING id;
    `, [userIds[2], roomIds[0]]);

    // Atnaujinam kambario užimtumą
    await client.query(`
      UPDATE rooms
      SET occupied_beds = occupied_beds + 1,
          status = 'OCCUPIED'
      WHERE id = $1
    `, [roomIds[0]]);

    // Insert sample requests
    await client.query(`
      INSERT INTO requests (student_id, room_id, status, documents)
      VALUES 
        ($1, $2, 'SUBMITTED', '{"declaration": "path/to/declaration.pdf", "income_statement": "path/to/income.pdf"}'),
        ($3, $4, 'UNDER_REVIEW', '{"declaration": "path/to/declaration2.pdf"}')
    `, [userIds[2], roomIds[0], userIds[3], roomIds[1]]);

    // Insert sample reservations
    await client.query(`
      INSERT INTO reservations (student_id, room_id, start_date, end_date, status)
      VALUES 
        ($1, $2, '2025-09-01', '2026-06-30', 'PENDING_APPROVAL'),
        ($3, $4, '2025-09-01', '2026-06-30', 'APPROVED')
    `, [userIds[2], roomIds[2], userIds[3], roomIds[6]]);

    // Insert sample inspections
    await client.query(`
      INSERT INTO inspections (room_id, student_id, supervisor_id, inspection_date, inspection_time, status, resident_will_attend)
      VALUES 
        ($1, $2, $3, '2025-02-15', '14:00:00', 'PENDING', NULL),
        ($4, $5, $3, '2025-02-16', '10:00:00', 'APPROVED', true)
    `, [roomIds[0], userIds[2], userIds[4], roomIds[1], userIds[3]]);

    // Insert sample notifications
    await client.query(`
      INSERT INTO notifications (user_id, title, message, type, status)
      VALUES 
        ($1, 'Sveiki atvykę!', 'Jūsų paskyra sėkmingai sukurta. Prašome pasikeisti slaptažodį.', 'INFO', 'UNSEEN'),
        ($2, 'Naujas prašymas', 'Gautas naujas apgyvendinimo prašymas peržiūrai.', 'REQUEST', 'UNSEEN'),
        ($3, 'Apžiūra patvirtinta', 'Jūsų kambario apžiūra buvo patvirtinta. Data: 2025-02-16, laikas: 10:00', 'INSPECTION', 'UNSEEN')
    `, [userIds[2], userIds[0], userIds[3]]);

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully!');
    console.log('\n📋 Test Users:');
    console.log('Admin: admin@vgtu.lt / password123');
    console.log('Dorm Admin: dorm1@vgtu.lt / password123');
    console.log('Student 1: student1@vgtu.lt / password123');
    console.log('Student 2: student2@vgtu.lt / password123');
    console.log('Supervisor: supervisor@vgtu.lt / password123');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run seed
seedDatabase()
  .then(() => {
    console.log('✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
