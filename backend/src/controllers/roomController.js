import { query } from '../config/database.js';

/**
 * Pagal realius duomenis (sutartys + apžiūros) perskaičiuoja kambario būseną
 * ir atnaujina rooms.status bei rooms.occupied_beds.
 *
 * Taisyklės:
 *  - OCCUPIED: visos vietos užimtos pagal aktyvias/signed sutartis
 *  - RESERVED: yra laisvų vietų, bet visos jos užrezervuotos apžiūromis
 *  - AVAILABLE: dar yra visiškai laisvų vietų, kurioms nėra rezervacijų
 */
export const recalculateRoomStatus = async (roomId) => {
  const statsRes = await query(
    `
    SELECT
      r.id,
      r.capacity,
      COALESCE(ct.current_residents, 0) AS current_residents,
      COALESCE(ins.reserved_slots, 0) AS reserved_slots
    FROM rooms r
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS current_residents
      FROM contracts c
      WHERE c.room_id = r.id
        AND c.status IN ('ACTIVE', 'SIGNED')
    ) ct ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS reserved_slots
      FROM inspections i
      WHERE i.room_id = r.id
        AND i.status IN ('PENDING', 'APPROVED')
    ) ins ON TRUE
    WHERE r.id = $1
    `,
    [roomId]
  );

  if (statsRes.rows.length === 0) return null;

  const { capacity, current_residents, reserved_slots } = statsRes.rows[0];

  const freeCapacity = Math.max(capacity - current_residents, 0);
  const availableForNew = Math.max(freeCapacity - reserved_slots, 0);

  let status = 'AVAILABLE';
  if (current_residents >= capacity) {
    status = 'OCCUPIED';
  } else if (freeCapacity > 0 && availableForNew === 0) {
    status = 'RESERVED';
  }

  await query(
    `
    UPDATE rooms
    SET status = $1,
        occupied_beds = $2
    WHERE id = $3
    `,
    [status, current_residents, roomId]
  );

  return { status, occupied_beds: current_residents, freeCapacity, reserved_slots, availableForNew };
};

// @desc    Get all rooms with filters
// @route   GET /api/rooms
// @access  Public
export const getRooms = async (req, res) => {
  try {
    const { dormitory_id, min_price, max_price, capacity, room_type, status } = req.query;

    const normalizedStatus = status ? status.toUpperCase() : null;

    let queryText = `
      SELECT
        r.id,
        r.dormitory_id,
        r.room_number,
        r.floor,
        r.capacity,
        r.price,
        r.room_type,
        r.status,
        r.description,
        r.amenities,
        r.images,
        d.name AS dormitory_name,
        d.address AS dormitory_address,
        COALESCE(r.occupied_beds, 0) AS occupied_beds,
        COALESCE(ins.reserved_slots, 0) AS reserved_slots,
        GREATEST(r.capacity - COALESCE(r.occupied_beds, 0), 0) AS total_free_beds,
        GREATEST(
          (r.capacity - COALESCE(r.occupied_beds, 0)) - COALESCE(ins.reserved_slots, 0),
          0
        ) AS available_beds
      FROM rooms r
      JOIN dormitories d ON r.dormitory_id = d.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS reserved_slots
        FROM inspections i
        WHERE i.room_id = r.id
          AND i.status IN ('PENDING', 'APPROVED')
      ) ins ON TRUE
      WHERE 1 = 1
    `;

    const params = [];
    let paramCount = 1;

    // Jei status nėra nurodytas – rodom tik kambarius, kur dar galima registruotis (yra laisvų vietų)
    if (!normalizedStatus) {
      queryText += `
        AND GREATEST(
              (r.capacity - COALESCE(r.occupied_beds, 0)) - COALESCE(ins.reserved_slots, 0),
              0
            ) > 0
      `;
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

    // Status filtras tik jei ne 'ALL'
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
      `
      SELECT
        r.id,
        r.dormitory_id,
        r.room_number,
        r.floor,
        r.capacity,
        r.price,
        r.room_type,
        r.status,
        r.description,
        r.amenities,
        r.images,
        d.name AS dormitory_name,
        d.address AS dormitory_address,
        COALESCE(ct.current_residents, 0) AS occupied_beds,
        COALESCE(ins.reserved_slots, 0) AS reserved_slots,
        GREATEST(r.capacity - COALESCE(ct.current_residents, 0), 0) AS total_free_beds,
        GREATEST(
          (r.capacity - COALESCE(ct.current_residents, 0)) - COALESCE(ins.reserved_slots, 0),
          0
        ) AS available_beds,
        json_agg(
          json_build_object(
            'id', u.id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'email', u.email
          )
        ) FILTER (WHERE u.id IS NOT NULL) AS residents
      FROM rooms r
      JOIN dormitories d ON r.dormitory_id = d.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS current_residents
        FROM contracts c
        WHERE c.room_id = r.id
          AND c.status IN ('ACTIVE', 'SIGNED')
      ) ct ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS reserved_slots
        FROM inspections i
        WHERE i.room_id = r.id
          AND i.status IN ('PENDING', 'APPROVED')
      ) ins ON TRUE
      LEFT JOIN contracts c2 ON c2.room_id = r.id AND c2.status IN ('ACTIVE', 'SIGNED')
      LEFT JOIN users u ON u.id = c2.student_id
      WHERE r.id = $1
      GROUP BY
        r.id,
        d.id,
        ct.current_residents,
        ins.reserved_slots
      `,
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

    // po redagavimo perskaičiuojam status pagal realius duomenis
    await recalculateRoomStatus(id);

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
