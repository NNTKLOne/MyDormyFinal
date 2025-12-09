import { query } from '../config/database.js';

/* ------------------------------------------------------------
   Helper: find dormitory assigned to dormitory admin
------------------------------------------------------------- */
const getDormitoryForAdmin = async (adminId) => {
  const dorm = await query(
      `SELECT id FROM dormitories WHERE admin_id = $1`,
      [adminId]
  );
  return dorm.rows[0] ?? null;
};

/* ------------------------------------------------------------
   Recalculate room status based on contracts & reservations
------------------------------------------------------------- */
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
        AND c.status = 'ACTIVE'
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
  if (current_residents >= capacity) status = 'OCCUPIED';
  else if (freeCapacity > 0 && availableForNew === 0) status = 'RESERVED';

  await query(
      `
    UPDATE rooms
    SET status = $1,
        occupied_beds = $2
    WHERE id = $3
    `,
      [status, current_residents, roomId]
  );

  return { status, occupied_beds: current_residents };
};

/* ------------------------------------------------------------
   GET ALL ROOMS (with filters)
   Students: use separate route
   Dormitory Admin: ONLY own dormitory rooms
   University Admin: see everything
------------------------------------------------------------- */
/* ------------------------------------------------------------
   GET ALL ROOMS (with filters)
   Dormitory Admin = only own dormitory
   University Admin = all rooms
------------------------------------------------------------- */
export const getRooms = async (req, res) => {
  try {
    const { user } = req;
    let forcedDormitoryId = null;

    /* ------------------------------------------------------------
       DORMITORY ADMIN MUST HAVE ASSIGNED DORM
    ------------------------------------------------------------- */
    if (user.user_type === "DORMITORY_ADMIN") {
      const dorm = await query(
          `SELECT id FROM dormitories WHERE admin_id = $1`,
          [user.id]
      );

      if (dorm.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Jums nepriskirtas joks bendrabutis."
        });
      }

      forcedDormitoryId = dorm.rows[0].id;
    }

    /* ------------------------------------------------------------
       GET FILTERS
    ------------------------------------------------------------- */
    const {
      dormitory_id,
      min_price,
      max_price,
      min_free_beds,
      room_type,
      status,
      floor
    } = req.query;

    const normalizedStatus = status ? status.toUpperCase() : null;

    /* ------------------------------------------------------------
       BASE QUERY
    ------------------------------------------------------------- */
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

        -- resident & reservation stats
        COALESCE(ct.current_residents, 0) AS occupied_beds,
        COALESCE(ins.reserved_slots, 0) AS reserved_slots,

        -- free beds computation
        GREATEST(r.capacity - COALESCE(ct.current_residents, 0), 0) AS total_free_beds,
        GREATEST(
            (r.capacity - COALESCE(ct.current_residents, 0)) - COALESCE(ins.reserved_slots, 0),
            0
        ) AS available_beds

      FROM rooms r
             JOIN dormitories d ON r.dormitory_id = d.id

             LEFT JOIN LATERAL (
        SELECT COUNT(*) AS current_residents
        FROM contracts c
        WHERE c.room_id = r.id AND c.status = 'ACTIVE'
        ) ct ON TRUE

             LEFT JOIN LATERAL (
        SELECT COUNT(*) AS reserved_slots
        FROM inspections i
        WHERE i.room_id = r.id AND i.status IN ('PENDING','APPROVED')
        ) ins ON TRUE

      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    /* ------------------------------------------------------------
       FORCE dormitory_id for Dorm Admin
    ------------------------------------------------------------- */
    if (forcedDormitoryId !== null) {
      queryText += ` AND r.dormitory_id = $${paramCount}`;
      params.push(forcedDormitoryId);
      paramCount++;

    } else if (dormitory_id) {
      queryText += ` AND r.dormitory_id = $${paramCount}`;
      params.push(dormitory_id);
      paramCount++;
    }

    /* ------------------------------------------------------------
       OPTIONAL FILTERS (always allowed)
    ------------------------------------------------------------- */

    // ROOM TYPE
    if (room_type) {
      queryText += ` AND r.room_type = $${paramCount}`;
      params.push(room_type);
      paramCount++;
    }

    // PRICE
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

    // STATUS
    if (normalizedStatus && normalizedStatus !== "ALL") {
      queryText += ` AND r.status = $${paramCount}`;
      params.push(normalizedStatus);
      paramCount++;
    }

    // FLOOR
    if (floor) {
      queryText += ` AND r.floor = $${paramCount}`;
      params.push(floor);
      paramCount++;
    }

    // MIN FREE BEDS
    if (min_free_beds) {
      queryText += ` AND (
        (r.capacity - COALESCE(ct.current_residents, 0)) 
        - COALESCE(ins.reserved_slots, 0)
      ) >= $${paramCount}`;
      params.push(min_free_beds);
      paramCount++;
    }

    /* ------------------------------------------------------------
       ORDERING
    ------------------------------------------------------------- */
    queryText += ` ORDER BY d.name, r.floor, r.room_number`;

    /* ------------------------------------------------------------
       RUN QUERY
    ------------------------------------------------------------- */
    const result = await query(queryText, params);

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error("GET ROOMS ERROR:", error);
    return res.status(500).json({ success: false, message: "Serverio klaida" });
  }
};


/* ------------------------------------------------------------
   GET ONE ROOM
   Students: allowed
   Dormitory Admin: only own dormitory
------------------------------------------------------------- */
export const getRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const roomData = await query(
        `
      SELECT
        r.id, r.dormitory_id, r.room_number, r.floor,
        r.capacity, r.price, r.room_type, r.status,
        r.description, r.amenities, r.images,

        d.name AS dormitory_name,
        d.address AS dormitory_address,

        COALESCE(ct.current_residents, 0) AS occupied_beds,
        COALESCE(ins.reserved_slots, 0) AS reserved_slots,

        GREATEST(r.capacity - COALESCE(ct.current_residents, 0), 0) AS total_free_beds,
        GREATEST(
          (r.capacity - COALESCE(ct.current_residents, 0))
          - COALESCE(ins.reserved_slots, 0),
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
        WHERE c.room_id = r.id AND c.status='ACTIVE'
      ) ct ON TRUE

      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS reserved_slots
        FROM inspections i
        WHERE i.room_id = r.id AND i.status IN ('PENDING','APPROVED')
      ) ins ON TRUE

      LEFT JOIN contracts c2 ON c2.room_id = r.id AND c2.status IN ('ACTIVE','SIGNED')
      LEFT JOIN users u ON u.id = c2.student_id

      WHERE r.id = $1
      GROUP BY r.id, d.id
      `,
        [id]
    );

    if (roomData.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Kambarys nerastas' });

    const room = roomData.rows[0];

    // Dormitory Admin: can view only own dormitory rooms
    if (req.user?.user_type === 'DORMITORY_ADMIN') {
      const dorm = await getDormitoryForAdmin(req.user.id);
      if (!dorm || dorm.id !== room.dormitory_id) {
        return res.status(403).json({
          success: false,
          message: 'Negalite pasiekti šio kambario — jis ne jūsų bendrabutyje.'
        });
      }
    }

    return res.json({ success: true, data: room });

  } catch (error) {
    console.error('Get room error:', error);
    return res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};

/* ------------------------------------------------------------
   CREATE ROOM
   Dormitory Admin: only in own dormitory
   University Admin: anywhere
------------------------------------------------------------- */
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
        message: 'Prašome užpildyti visus privalomus laukus'
      });
    }

    // Dormitory Admin protection
    if (req.user?.user_type === 'DORMITORY_ADMIN') {
      const dorm = await getDormitoryForAdmin(req.user.id);

      if (!dorm || dorm.id !== Number(dormitory_id)) {
        return res.status(403).json({
          success: false,
          message: 'Negalite kurti kambario kitame bendrabutyje.'
        });
      }
    }

    // Check if room number exists
    const existing = await query(
        'SELECT id FROM rooms WHERE dormitory_id = $1 AND room_number = $2',
        [dormitory_id, room_number]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Kambarys su šiuo numeriu jau egzistuoja šiame bendrabutyje'
      });
    }

    const result = await query(
        `
      INSERT INTO rooms 
        (dormitory_id, room_number, floor, capacity, occupied_beds,
         price, room_type, status, description, amenities, images)
      VALUES ($1,$2,$3,$4,0,$5,$6,'AVAILABLE',$7,$8,$9)
      RETURNING *
      `,
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

    // update counters
    await query(
        `
      UPDATE dormitories
      SET total_rooms = total_rooms + 1,
          available_rooms = available_rooms + 1
      WHERE id = $1
      `,
        [dormitory_id]
    );

    return res.status(201).json({
      success: true,
      message: 'Kambarys sukurtas',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create room error:', error);
    return res.status(500).json({ success: false, message: 'Serverio klaida' });
  }
};

/* ------------------------------------------------------------
   UPDATE ROOM
   Dormitory Admin: only own dormitory rooms
   University Admin: any
------------------------------------------------------------- */
export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    if (req.user?.user_type === 'DORMITORY_ADMIN') {
      const dorm = await getDormitoryForAdmin(req.user.id);
      const checkRoom = await query(
          'SELECT dormitory_id FROM rooms WHERE id = $1',
          [id]
      );

      if (
          checkRoom.rows.length === 0 ||
          checkRoom.rows[0].dormitory_id !== dorm.id
      ) {
        return res.status(403).json({
          success: false,
          message: 'Negalite redaguoti kambario iš kito bendrabučio.'
        });
      }
    }

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
        `
      UPDATE rooms
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
      RETURNING *
      `,
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

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Kambarys nerastas' });

    await recalculateRoomStatus(id);

    return res.json({
      success: true,
      message: 'Kambarys atnaujintas',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update room error:', error);
    return res.status(500).json({ success: false, message: 'Serverio klaida' });
  }
};

/* ------------------------------------------------------------
   DELETE ROOM
   Dormitory Admin: only own dormitory rooms
   University Admin: any
------------------------------------------------------------- */
export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    // Check active contracts
    const active = await query(
        `SELECT COUNT(*) AS count FROM contracts 
       WHERE room_id=$1 AND status IN ('ACTIVE','SIGNED')`,
        [id]
    );

    if (Number(active.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Negalima ištrinti kambario su aktyviomis sutartimis'
      });
    }

    // Ownership check
    if (req.user?.user_type === 'DORMITORY_ADMIN') {
      const dorm = await getDormitoryForAdmin(req.user.id);

      const check = await query(
          'SELECT dormitory_id, status FROM rooms WHERE id = $1',
          [id]
      );

      if (
          check.rows.length === 0 ||
          check.rows[0].dormitory_id !== dorm.id
      ) {
        return res.status(403).json({
          success: false,
          message: 'Negalite ištrinti kambario iš kito bendrabučio.'
        });
      }
    }

    const roomInfo = await query(
        'SELECT dormitory_id, status FROM rooms WHERE id = $1',
        [id]
    );

    if (roomInfo.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Kambarys nerastas' });

    const { dormitory_id, status } = roomInfo.rows[0];

    await query('DELETE FROM rooms WHERE id = $1', [id]);

    await query(
        `
      UPDATE dormitories
      SET total_rooms = total_rooms - 1,
          available_rooms = CASE
            WHEN $2 = 'AVAILABLE' THEN available_rooms - 1
            ELSE available_rooms
          END
      WHERE id = $1
      `,
        [dormitory_id, status]
    );

    return res.json({ success: true, message: 'Kambarys ištrintas' });

  } catch (error) {
    console.error('Delete room error:', error);
    return res.status(500).json({ success: false, message: 'Serverio klaida' });
  }
};

/* ------------------------------------------------------------
   GET dormitories list (public)
------------------------------------------------------------- */
export const getDormitories = async (req, res) => {
  try {
    const result = await query(`
      SELECT
        d.*,
        COUNT(r.id) as total_rooms,
        SUM(CASE WHEN r.status='AVAILABLE' THEN 1 ELSE 0 END) as available_rooms_count,
        SUM(r.capacity - COALESCE(r.occupied_beds, 0)) as total_available_beds
      FROM dormitories d
             LEFT JOIN rooms r ON r.dormitory_id = d.id
      GROUP BY d.id
      ORDER BY d.name
    `);

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Get dormitories error:', error);
    return res.status(500).json({ success: false, message: 'Serverio klaida' });
  }
};
