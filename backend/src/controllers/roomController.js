import { query } from '../config/database.js';

// @desc    Get all rooms with filters
// @route   GET /api/rooms
// @access  Public
export const getRooms = async (req, res) => {
  try {
    const { 
      dormitory_id, 
      min_price, 
      max_price, 
      capacity, 
      status,
      room_type 
    } = req.query;

    let queryText = `
      SELECT r.*, d.name as dormitory_name, d.address as dormitory_address
      FROM rooms r
      JOIN dormitories d ON r.dormitory_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Apply filters
    if (dormitory_id) {
      queryText += ` AND r.dormitory_id = $${paramCount}`;
      params.push(dormitory_id);
      paramCount++;
    }

    if (min_price) {
      queryText += ` AND r.price >= $${paramCount}`;
      params.push(min_price);
      paramCount++;
    }

    if (max_price) {
      queryText += ` AND r.price <= $${paramCount}`;
      params.push(max_price);
      paramCount++;
    }

    if (capacity) {
      queryText += ` AND r.capacity = $${paramCount}`;
      params.push(capacity);
      paramCount++;
    }

    if (status) {
      queryText += ` AND r.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (room_type) {
      queryText += ` AND r.room_type = $${paramCount}`;
      params.push(room_type);
      paramCount++;
    }

    queryText += ' ORDER BY r.dormitory_id, r.room_number';

    const result = await query(queryText, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida gaunant kambarius'
    });
  }
};

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Public
export const getRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT r.*, d.name as dormitory_name, d.address as dormitory_address,
              d.id as dormitory_id,
              ci.phone as dormitory_phone, ci.email as dormitory_email
       FROM rooms r
       JOIN dormitories d ON r.dormitory_id = d.id
       LEFT JOIN contact_information ci ON d.contact_id = ci.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kambarys nerastas'
      });
    }

    // Get current residents
    const residentsResult = await query(
      `SELECT u.id, u.first_name, u.last_name, u.faculty, u.study_program
       FROM users u
       JOIN contracts c ON u.id = c.student_id
       WHERE c.room_id = $1 AND c.status = 'ACTIVE'`,
      [id]
    );

    const room = result.rows[0];
    room.current_residents = residentsResult.rows;

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida gaunant kambarį'
    });
  }
};

// @desc    Create room
// @route   POST /api/rooms
// @access  Private (Dormitory Admin)
export const createRoom = async (req, res) => {
  try {
    const {
      dormitory_id,
      room_number,
      floor,
      capacity,
      price,
      room_type,
      description,
      amenities
    } = req.body;

    // Validation
    if (!dormitory_id || !room_number || !capacity || !price) {
      return res.status(400).json({
        success: false,
        message: 'Prašome užpildyti visus privalomus laukus'
      });
    }

    const result = await query(
      `INSERT INTO rooms (dormitory_id, room_number, floor, capacity, price, room_type, description, amenities)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [dormitory_id, room_number, floor, capacity, price, room_type, description, amenities || []]
    );

    // Update dormitory total rooms count
    await query(
      'UPDATE dormitories SET total_rooms = total_rooms + 1, available_rooms = available_rooms + 1 WHERE id = $1',
      [dormitory_id]
    );

    res.status(201).json({
      success: true,
      message: 'Kambarys sėkmingai sukurtas',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create room error:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Kambarys su tokiu numeriu jau egzistuoja šiame bendrabutyje'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Serverio klaida kuriant kambarį'
    });
  }
};

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private (Dormitory Admin)
export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      room_number,
      floor,
      capacity,
      price,
      room_type,
      status,
      description,
      amenities
    } = req.body;

    // Check if room exists
    const checkResult = await query('SELECT * FROM rooms WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kambarys nerastas'
      });
    }

    const result = await query(
      `UPDATE rooms 
       SET room_number = COALESCE($1, room_number),
           floor = COALESCE($2, floor),
           capacity = COALESCE($3, capacity),
           price = COALESCE($4, price),
           room_type = COALESCE($5, room_type),
           status = COALESCE($6, status),
           description = COALESCE($7, description),
           amenities = COALESCE($8, amenities)
       WHERE id = $9
       RETURNING *`,
      [room_number, floor, capacity, price, room_type, status, description, amenities, id]
    );

    res.json({
      success: true,
      message: 'Kambarys sėkmingai atnaujintas',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida atnaujinant kambarį'
    });
  }
};

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private (Dormitory Admin)
export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if room exists
    const checkResult = await query('SELECT dormitory_id FROM rooms WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kambarys nerastas'
      });
    }

    const dormitory_id = checkResult.rows[0].dormitory_id;

    // Delete room
    await query('DELETE FROM rooms WHERE id = $1', [id]);

    // Update dormitory rooms count
    await query(
      'UPDATE dormitories SET total_rooms = total_rooms - 1, available_rooms = available_rooms - 1 WHERE id = $1',
      [dormitory_id]
    );

    res.json({
      success: true,
      message: 'Kambarys sėkmingai ištrintas'
    });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida trinant kambarį'
    });
  }
};

// @desc    Get dormitories
// @route   GET /api/rooms/dormitories
// @access  Public
export const getDormitories = async (req, res) => {
  try {
    const result = await query(
      `SELECT d.*, ci.phone, ci.email, ci.address,
              u.first_name as admin_first_name, u.last_name as admin_last_name
       FROM dormitories d
       LEFT JOIN contact_information ci ON d.contact_id = ci.id
       LEFT JOIN users u ON d.admin_id = u.id
       ORDER BY d.name`
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get dormitories error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida gaunant bendrabučius'
    });
  }
};
