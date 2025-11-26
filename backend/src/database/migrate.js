import pool from '../config/database.js';

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Drop tables if exist (for development)
    await client.query(`
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS inspections CASCADE;
      DROP TABLE IF EXISTS contracts CASCADE;
      DROP TABLE IF EXISTS rooms CASCADE;
      DROP TABLE IF EXISTS dormitories CASCADE;
      DROP TABLE IF EXISTS requests CASCADE;
      DROP TABLE IF EXISTS contact_information CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP SEQUENCE IF EXISTS contract_sequence CASCADE;
      DROP TYPE IF EXISTS user_type CASCADE;
      DROP TYPE IF EXISTS notification_status CASCADE;
      DROP TYPE IF EXISTS inspection_status CASCADE;
      DROP TYPE IF EXISTS room_status CASCADE;
      DROP TYPE IF EXISTS contract_status CASCADE;
    `);

    // Create ENUM types
    await client.query(`
      CREATE TYPE user_type AS ENUM ('STUDENT', 'UNIVERSITY_ADMIN', 'DORMITORY_ADMIN', 'SUPERVISOR', 'RESIDENT');
      CREATE TYPE inspection_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED', 'COMPLETED');
      CREATE TYPE room_status AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED');
      CREATE TYPE contract_status AS ENUM ('DRAFT', 'SIGNED', 'ACTIVE', 'EXPIRED', 'TERMINATED');
    `);

    // Create contact_information table
    await client.query(`
      CREATE TABLE contact_information (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20),
        email VARCHAR(255) NOT NULL UNIQUE,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create users table
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        user_type user_type NOT NULL,
        contact_id INTEGER REFERENCES contact_information(id) ON DELETE SET NULL,
        faculty VARCHAR(100),
        study_program VARCHAR(100),
        student_id VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        must_change_password BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create dormitories table
    await client.query(`
      CREATE TABLE dormitories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL CHECK (
          name IN (
            'VGTU Bendrabutis Nr. 1',
            'VGTU Bendrabutis Nr. 2',
            'VGTU Bendrabutis Nr. 3',
            'VGTU Bendrabutis Nr. 4',
            'VGTU Bendrabutis Nr. 5'
          )
        ),
        address TEXT NOT NULL,
        contact_id INTEGER REFERENCES contact_information(id) ON DELETE SET NULL,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        supervisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        total_rooms INTEGER DEFAULT 0,
        available_rooms INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create rooms table
    await client.query(`
      CREATE TABLE rooms (
        id SERIAL PRIMARY KEY,
        dormitory_id INTEGER NOT NULL REFERENCES dormitories(id) ON DELETE CASCADE,
        room_number VARCHAR(20) NOT NULL,
        floor INTEGER,
        capacity INTEGER NOT NULL,
        occupied_beds INTEGER DEFAULT 0,
        price DECIMAL(10, 2) NOT NULL,
        room_type VARCHAR(50),
        status room_status DEFAULT 'AVAILABLE',
        description TEXT,
        amenities TEXT[],
        images TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(dormitory_id, room_number)
      );
    `);

    // Create sequence for contract numbering
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS contract_sequence
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
    `);

    // Create contracts table
    await client.query(`
      CREATE TABLE contracts (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        contract_number VARCHAR(50) UNIQUE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        monthly_price DECIMAL(10, 2) NOT NULL,
        status contract_status DEFAULT 'DRAFT',
        signed_at TIMESTAMP,
        document_path TEXT,
        terms_and_conditions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create inspections table
    await client.query(`
      CREATE TABLE inspections (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        supervisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        inspection_date DATE NOT NULL,
        inspection_time TIME NOT NULL,
        status inspection_status DEFAULT 'PENDING',
        resident_will_attend BOOLEAN,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_type ON users(user_type);
      CREATE INDEX idx_rooms_dormitory ON rooms(dormitory_id);
      CREATE INDEX idx_rooms_status ON rooms(status);
      CREATE INDEX idx_contracts_student ON contracts(student_id);
      CREATE INDEX idx_contracts_status ON contracts(status);
      CREATE INDEX idx_inspections_date ON inspections(inspection_date);
      CREATE INDEX idx_inspections_student ON inspections(student_id);
      CREATE INDEX idx_inspections_status ON inspections(status);
    `);

    // Create updated_at trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Apply updated_at trigger to all tables
    const tables = ['users', 'contact_information', 'dormitories', 'rooms', 'contracts', 'inspections'];
    for (const table of tables) {
      await client.query(`
        CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    await client.query('COMMIT');
    console.log('Database tables created successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migration
createTables()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });