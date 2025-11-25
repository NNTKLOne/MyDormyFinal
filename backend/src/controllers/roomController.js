import { query } from '../config/database.js';

// @desc    Get all rooms with filters
// @route   GET /api/rooms
// @access  Public
// @desc    Get all rooms with filters
// @route   GET /api/rooms
// @access  Public (but filtered for dormitory admin)
export const getRooms = async (req, res) => {
  try {
    const { dormitory_id, min_price, max_price, capacity, room_type, status } = req.query;

    const normalizedStatus = status ? status.toUpperCase() : null;

    let queryText = `
      SELECT
        r.*,
        d.name as dormitory_name,
        d.address as dormitory_address,
        COALESCE((
                   SELECT COUNT(*)
                   FROM inspections i
                   WHERE i.room_id = r.id
                     AND i.status IN ('PENDING', 'APPROVED')
                 ), 0) as reserved_slots,
        GREATEST(
            r.capacity
              - COALESCE(r.occupied_beds, 0)
              - COALESCE((
                           SELECT COUNT(*)
                           FROM inspections i
                           WHERE i.room_id = r.id
                             AND i.status IN ('PENDING', 'APPROVED')
                         ), 0),
            0
        ) as available_beds
      FROM rooms r
             JOIN dormitories d ON r.dormitory_id = d.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    // 👉 RESTRIKCIJA BENDRABUČIO ADMINUI
    if (req.user && req.user.user_type === "DORMITORY_ADMIN") {
      queryText += ` AND r.dormitory_id IN (
        SELECT id FROM dormitories WHERE admin_id = $${paramCount}
      )`;
      params.push(req.user.id);
      paramCount++;
    }

    // Tik jei status NEPATEIKTAS - rodom tik kambarius su laisvom vietom
    if (!normalizedStatus) {
      queryText += ` AND (r.capacity - COALESCE(r.occupied_beds, 0)) > 0`;
    }

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
      queryText += ` AND r.capacity >= $${paramCount}`;
      params.push(capacity);
      paramCount++;
    }

    if (room_type) {
      queryText += ` AND r.room_type = $${paramCount}`;
      params.push(room_type);
      paramCount++;
    }

    // Filtruojame tik jei status ne ALL
    if (normalizedStatus && normalizedStatus !== 'ALL') {
      queryText += ` AND r.status = $${paramCount}`;
      params.push(normalizedStatus);
      paramCount++;
    }

    queryText += ' ORDER BY d.name, r.room_number';

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
      message: 'Serverio klaida'
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
      `SELECT 
        r.*,
        d.name as dormitory_name,
        d.address as dormitory_address,
        (r.capacity - COALESCE(r.occupied_beds, 0)) as available_beds,
        json_agg(
          json_build_object(
            'id', u.id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'email', u.email
          )
        ) FILTER (WHERE u.id IS NOT NULL) as residents
      FROM rooms r
      JOIN dormitories d ON r.dormitory_id = d.id
      LEFT JOIN contracts c ON c.room_id = r.id AND c.status IN ('ACTIVE', 'SIGNED')
      LEFT JOIN users u ON u.id = c.student_id
      WHERE r.id = $1
      GROUP BY r.id, d.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kambarys nerastas'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};

// @desc    Create room with all fields
// @route   POST /api/rooms
// @access  Private (Dormitory Admin, University Admin)
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
      amenities,
      images
    } = req.body;

    if (!dormitory_id || !room_number || !capacity || !price) {
      return res.status(400).json({
        success: false,
        message: 'Prašome užpildyti visus privalomus laukus (bendrabutis, numeris, vietų skaičius, kaina)'
      });
    }

    // Check if room number already exists in this dormitory
    const existingRoom = await query(
      'SELECT id FROM rooms WHERE dormitory_id = $1 AND room_number = $2',
      [dormitory_id, room_number]
    );

    if (existingRoom.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Kambarys su šiuo numeriu jau egzistuoja šiame bendrabutyje'
      });
    }

    // Create room with all fields
    const result = await query(
      `INSERT INTO rooms 
       (dormitory_id, room_number, floor, capacity, occupied_beds, price, 
        room_type, status, description, amenities, images)
       VALUES ($1, $2, $3, $4, 0, $5, $6, 'AVAILABLE', $7, $8, $9)
       RETURNING *`,
      [
        dormitory_id,
        room_number,
        floor || null,
        capacity,
        price,
        room_type || null,
        description || null,
        amenities || [],
        images || []
      ]
    );

    // Update dormitory total_rooms and available_rooms
    await query(
      `UPDATE dormitories 
       SET total_rooms = total_rooms + 1,
           available_rooms = available_rooms + 1
       WHERE id = $1`,
      [dormitory_id]
    );

    res.status(201).json({
      success: true,
      message: 'Kambarys sėkmingai sukurtas',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida kuriant kambarį'
    });
  }
};

// @desc    Update room with all fields
// @route   PUT /api/rooms/:id
// @access  Private (Dormitory Admin, University Admin)
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
      amenities,
      images
    } = req.body;

    const result = await query(
      `UPDATE rooms 
       SET room_number = COALESCE($1, room_number),
           floor = COALESCE($2, floor),
           capacity = COALESCE($3, capacity),
           price = COALESCE($4, price),
           room_type = COALESCE($5, room_type),
           status = COALESCE($6, status),
           description = COALESCE($7, description),
           amenities = COALESCE($8, amenities),
           images = COALESCE($9, images)
       WHERE id = $10
       RETURNING *`,
      [
        room_number,
        floor,
        capacity,
        price,
        room_type,
        status,
        description,
        amenities,
        images,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kambarys nerastas'
      });
    }

    res.json({
      success: true,
      message: 'Kambarys atnaujintas',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private (Dormitory Admin, University Admin)
export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if room has active contracts
    const contractCheck = await query(
      "SELECT COUNT(*) as count FROM contracts WHERE room_id = $1 AND status IN ('ACTIVE', 'SIGNED')",
      [id]
    );

    if (parseInt(contractCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Negalima ištrinti kambario su aktyviomis sutartimis'
      });
    }

    // Get dormitory_id before deleting
    const roomResult = await query(
      'SELECT dormitory_id, status FROM rooms WHERE id = $1',
      [id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kambarys nerastas'
      });
    }

    const { dormitory_id, status } = roomResult.rows[0];

    // Delete room
    await query('DELETE FROM rooms WHERE id = $1', [id]);

    // Update dormitory counts
    await query(
      `UPDATE dormitories 
       SET total_rooms = total_rooms - 1,
           available_rooms = CASE 
             WHEN $2 = 'AVAILABLE' THEN available_rooms - 1 
             ELSE available_rooms 
           END
       WHERE id = $1`,
      [dormitory_id, status]
    );

    res.json({
      success: true,
      message: 'Kambarys ištrintas'
    });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};

// @desc    Get dormitories list with counts
// @route   GET /api/rooms/dormitories
// @access  Public
export const getDormitories = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        d.*,
        COUNT(r.id) as total_rooms,
        SUM(CASE WHEN r.status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_rooms_count,
        SUM(r.capacity - COALESCE(r.occupied_beds, 0)) as total_available_beds
      FROM dormitories d
      LEFT JOIN rooms r ON r.dormitory_id = d.id
      GROUP BY d.id
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
      message: 'Serverio klaida'
    });
  }
};
