import { query } from '../config/database.js';

/* ================================
   GET ROOMS (LIMIT FOR DORM ADMIN)
================================ */
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

    /* =========================================
        NEW: SHOW ONLY ADMIN'S OWN DORMITORY
       ========================================= */
    // NEW: SHOW ONLY ADMIN'S OWN DORMITORY
    if (req.user && req.user.user_type === "DORMITORY_ADMIN") {
      queryText += ` AND d.admin_id = $${paramCount}`;
      params.push(req.user.id);
      paramCount++;
    }


    // Tik jei status NEPATEIKTAS - rodom tik laisvus kambarius
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

    if (normalizedStatus && normalizedStatus !== 'ALL') {
      queryText += ` AND r.status = $${paramCount}`;
      params.push(normalizedStatus);
      paramCount++;
    }

    queryText += ` ORDER BY d.name, r.room_number`;

    const result = await query(queryText, params);

    res.json({ success: true, count: result.rows.length, data: result.rows });

  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ success: false, message: 'Serverio klaida' });
  }
};

/* ================================
   GET SINGLE ROOM (ADMIN FILTER)
================================ */
export const getRoom = async (req, res) => {
  try {
    const { id } = req.params;

    // ADMIN access restriction
    const adminFilter = `
      AND d.admin_id = $2
    `;

    const isDormAdmin = req.user.user_type === "DORMITORY_ADMIN";

    const result = await query(
        `
      SELECT 
        r.*,
        d.name as dormitory_name,
        d.address as dormitory_address,
        (r.capacity - COALESCE(r.occupied_beds, 0)) as available_beds
      FROM rooms r
      JOIN dormitories d ON r.dormitory_id = d.id
      WHERE r.id = $1
      ${isDormAdmin ? adminFilter : ""}
      `,
        isDormAdmin ? [id, req.user.id] : [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Kambarys nerastas" });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error("Get room error:", error);
    res.status(500).json({ success: false, message: "Serverio klaida" });
  }
};

/* ================================
   CREATE ROOM (LOCK TO OWN DORM)
================================ */
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
        message: "Užpildykite visus privalomus laukus"
      });
    }

    /* =====================================================
        NEW: DORMITORY ADMIN CAN ONLY CREATE IN HIS DORM
       ===================================================== */
    if (req.user.user_type === "DORMITORY_ADMIN") {
      const check = await query(
          "SELECT id FROM dormitories WHERE id = $1 AND admin_id = $2",
          [dormitory_id, req.user.id]
      );

      if (check.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Negalite kurti kambarių šiame bendrabutyje"
        });
      }
    }

    const existingRoom = await query(
        "SELECT id FROM rooms WHERE dormitory_id = $1 AND room_number = $2",
        [dormitory_id, room_number]
    );

    if (existingRoom.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Kambarys su šiuo numeriu jau egzistuoja"
      });
    }

    const result = await query(
        `
      INSERT INTO rooms 
      (dormitory_id, room_number, floor, capacity, occupied_beds, price, 
       room_type, status, description, amenities, images)
      VALUES ($1, $2, $3, $4, 0, $5, $6, 'AVAILABLE', $7, $8, $9)
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

    await query(
        `
      UPDATE dormitories 
      SET total_rooms = total_rooms + 1,
          available_rooms = available_rooms + 1
      WHERE id = $1
      `,
        [dormitory_id]
    );

    res.status(201).json({
      success: true,
      message: "Kambarys sukurtas",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({ success: false, message: "Serverio klaida kuriant kambarį" });
  }
};

/* ================================
   UPDATE ROOM (ADMIN RESTRICTION)
================================ */
export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.user_type === "DORMITORY_ADMIN") {
      const check = await query(
          `SELECT r.id 
         FROM rooms r 
         JOIN dormitories d ON d.id = r.dormitory_id
         WHERE r.id = $1 AND d.admin_id = $2`,
          [id, req.user.id]
      );

      if (check.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Negalite redaguoti šio kambario"
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

    res.json({ success: true, message: "Kambarys atnaujintas", data: result.rows[0] });

  } catch (error) {
    console.error("Update room error:", error);
    res.status(500).json({ success: false, message: "Serverio klaida" });
  }
};

/* ================================
   DELETE ROOM (ADMIN RESTRICTION)
================================ */
export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.user_type === "DORMITORY_ADMIN") {
      const check = await query(
          `SELECT r.id 
         FROM rooms r 
         JOIN dormitories d ON d.id = r.dormitory_id
         WHERE r.id = $1 AND d.admin_id = $2`,
          [id, req.user.id]
      );

      if (check.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Negalite ištrinti šio kambario"
        });
      }
    }

    const activeContracts = await query(
        "SELECT COUNT(*) FROM contracts WHERE room_id = $1 AND status IN ('ACTIVE', 'SIGNED')",
        [id]
    );

    if (parseInt(activeContracts.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: "Negalima ištrinti kambario su aktyviomis sutartimis"
      });
    }

    await query("DELETE FROM rooms WHERE id = $1", [id]);
    res.json({ success: true, message: "Kambarys ištrintas" });

  } catch (error) {
    console.error("Delete room error:", error);
    res.status(500).json({ success: false, message: "Serverio klaida" });
  }
};
