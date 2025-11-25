import { query } from '../config/database.js';

/* ======================================================
   GET ROOMS
   - Student/University admin: mato visus
   - DORMITORY_ADMIN: tik savo bendrabučių kambarius
   - SUPERVISOR: tik savo bendrabučio kambarius
====================================================== */
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
      SELECT
        r.*,
        d.name   AS dormitory_name,
        d.address AS dormitory_address,
        d.admin_id,
        d.supervisor_id
      FROM rooms r
             JOIN dormitories d ON r.dormitory_id = d.id
      WHERE 1=1
    `;

    const params = [];
    let p = 1;

    const userType = req.user?.user_type;
    const userId   = req.user?.id;

    // ADMIN / SUPERVISOR RESTRICTION
    if (userType === 'DORMITORY_ADMIN') {
      queryText += ` AND d.admin_id = $${p}`;
      params.push(userId);
      p++;
    } else if (userType === 'SUPERVISOR') {
      queryText += ` AND d.supervisor_id = $${p}`;
      params.push(userId);
      p++;
    }

    // Optional filters
    if (dormitory_id) {
      queryText += ` AND r.dormitory_id = $${p}`;
      params.push(dormitory_id);
      p++;
    }

    if (min_price) {
      queryText += ` AND r.price >= $${p}`;
      params.push(min_price);
      p++;
    }

    if (max_price) {
      queryText += ` AND r.price <= $${p}`;
      params.push(max_price);
      p++;
    }

    if (capacity) {
      queryText += ` AND r.capacity = $${p}`;
      params.push(capacity);
      p++;
    }

    if (status) {
      queryText += ` AND r.status = $${p}`;
      params.push(status);
      p++;
    }

    if (room_type) {
      queryText += ` AND r.room_type = $${p}`;
      params.push(room_type);
      p++;
    }

    queryText += ' ORDER BY r.dormitory_id, r.room_number';

    const result = await query(queryText, params);

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Get rooms error:', error);
    return res.status(500).json({
      success: false,
      message: 'Serverio klaida gaunant kambarius'
    });
  }
};


/* ======================================================
   GET ONE ROOM
   - ta pati logika: admin/supervisor tik savo
====================================================== */
export const getRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
        `
          SELECT
            r.*,
            d.name   AS dormitory_name,
            d.address AS dormitory_address,
            d.id     AS dormitory_id,
            d.admin_id,
            d.supervisor_id
          FROM rooms r
                 JOIN dormitories d ON r.dormitory_id = d.id
          WHERE r.id = $1
        `,
        [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kambarys nerastas'
      });
    }

    const room = result.rows[0];
    const userType = req.user?.user_type;
    const userId   = req.user?.id;

    // Admin / supervisor access restriction
    if (userType === 'DORMITORY_ADMIN' && room.admin_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Neturite teisių peržiūrėti šio kambario'
      });
    }

    if (userType === 'SUPERVISOR' && room.supervisor_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Neturite teisių peržiūrėti šio kambario'
      });
    }

    return res.json({
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


/* ======================================================
   CREATE ROOM
   - DORMITORY_ADMIN / SUPERVISOR gali kurti TIK savo bendrabutyje
   - UNIVERSITY_ADMIN gali kurti bet kur
====================================================== */
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

    if (!dormitory_id || !room_number || !capacity || !price) {
      return res.status(400).json({
        success: false,
        message: 'Prašome užpildyti visus privalomus laukus'
      });
    }

    const userType = req.user?.user_type;
    const userId   = req.user?.id;

    // Check dormitory ownership when not UNIVERSITY_ADMIN
    if (userType === 'DORMITORY_ADMIN' || userType === 'SUPERVISOR') {
      const dormCheck = await query(
          `
          SELECT id, admin_id, supervisor_id
          FROM dormitories
          WHERE id = $1
        `,
          [dormitory_id]
      );

      if (dormCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Bendrabutis nerastas'
        });
      }

      const dorm = dormCheck.rows[0];

      if (
          userType === 'DORMITORY_ADMIN' &&
          dorm.admin_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: 'Neturite teisių kurti kambario šiame bendrabutyje'
        });
      }

      if (
          userType === 'SUPERVISOR' &&
          dorm.supervisor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: 'Neturite teisių kurti kambario šiame bendrabutyje'
        });
      }
    }

    const result = await query(
        `
        INSERT INTO rooms 
          (dormitory_id, room_number, floor, capacity, price, room_type, description, amenities)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
        [
          dormitory_id,
          room_number,
          floor,
          capacity,
          price,
          room_type || null,
          description || null,
          amenities || []
        ]
    );

    // Update dormitory counters
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


/* ======================================================
   UPDATE ROOM
   - DORMITORY_ADMIN / SUPERVISOR gali keisti TIK savo bendrabučio kambarius
====================================================== */
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

    const userType = req.user?.user_type;
    const userId   = req.user?.id;

    // Check exists & ownership
    const checkResult = await query(
        `
        SELECT r.*, d.admin_id, d.supervisor_id
        FROM rooms r
        JOIN dormitories d ON r.dormitory_id = d.id
        WHERE r.id = $1
      `,
        [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kambarys nerastas'
      });
    }

    const room = checkResult.rows[0];

    if (userType === 'DORMITORY_ADMIN' && room.admin_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Neturite teisių redaguoti šio kambario'
      });
    }

    if (userType === 'SUPERVISOR' && room.supervisor_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Neturite teisių redaguoti šio kambario'
      });
    }

    const result = await query(
        `
        UPDATE rooms 
        SET room_number = COALESCE($1, room_number),
            floor       = COALESCE($2, floor),
            capacity    = COALESCE($3, capacity),
            price       = COALESCE($4, price),
            room_type   = COALESCE($5, room_type),
            status      = COALESCE($6, status),
            description = COALESCE($7, description),
            amenities   = COALESCE($8, amenities)
        WHERE id = $9
        RETURNING *
      `,
        [
          room_number || null,
          floor || null,
          capacity || null,
          price || null,
          room_type || null,
          status || null,
          description || null,
          amenities || null,
          id
        ]
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


/* ======================================================
   DELETE ROOM
   - DORMITORY_ADMIN / SUPERVISOR gali trinti TIK savo bendrabučio kambarius
====================================================== */
export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const userType = req.user?.user_type;
    const userId   = req.user?.id;

    // Check exists & ownership
    const checkResult = await query(
        `
        SELECT r.dormitory_id, d.admin_id, d.supervisor_id
        FROM rooms r
        JOIN dormitories d ON r.dormitory_id = d.id
        WHERE r.id = $1
      `,
        [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kambarys nerastas'
      });
    }

    const { dormitory_id, admin_id, supervisor_id } = checkResult.rows[0];

    if (userType === 'DORMITORY_ADMIN' && admin_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Neturite teisių ištrinti šio kambario'
      });
    }

    if (userType === 'SUPERVISOR' && supervisor_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Neturite teisių ištrinti šio kambario'
      });
    }

    await query('DELETE FROM rooms WHERE id = $1', [id]);

    await query(
        `
        UPDATE dormitories
        SET total_rooms     = total_rooms - 1,
            available_rooms = GREATEST(available_rooms - 1, 0)
        WHERE id = $1
      `,
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


/* ======================================================
   GET DORMITORIES
   - Student / University admin – visi
   - DORMITORY_ADMIN – tik jo
   - SUPERVISOR – tik jo
====================================================== */
export const getDormitories = async (req, res) => {
  try {
    let queryText = `
      SELECT 
        d.*, 
        ci.phone, 
        ci.email, 
        ci.address,
        u.first_name AS admin_first_name,
        u.last_name  AS admin_last_name
      FROM dormitories d
      LEFT JOIN contact_information ci ON d.contact_id = ci.id
      LEFT JOIN users u ON d.admin_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let p = 1;

    const userType = req.user?.user_type;
    const userId   = req.user?.id;

    if (userType === 'DORMITORY_ADMIN') {
      queryText += ` AND d.admin_id = $${p}`;
      params.push(userId);
      p++;
    } else if (userType === 'SUPERVISOR') {
      queryText += ` AND d.supervisor_id = $${p}`;
      params.push(userId);
      p++;
    }

    queryText += ' ORDER BY d.name';

    const result = await query(queryText, params);

    return res.json({
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
