import { query } from '../config/database.js';
import { recalculateRoomStatus } from './roomController.js';

// @desc    Create inspection appointment (Student books inspection)
// @route   POST /api/inspections
// @access  Private (Student)
export const createInspection = async (req, res) => {
  try {
    const { room_id, inspection_date, inspection_time } = req.body;
    const student_id = req.user.id;

    if (!room_id || !inspection_date || !inspection_time) {
      return res.status(400).json({
        success: false,
        message: 'Prašome užpildyti visus laukus'
      });
    }

    // Check if room has available beds (įskaičiuojant rezervacijas)
    const roomCheck = await query(
      `SELECT 
         r.id,
         r.capacity,
         r.occupied_beds,
         r.status,
         COALESCE(ins.reserved_slots, 0) AS reserved_slots
       FROM rooms r
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS reserved_slots
         FROM inspections i
         WHERE i.room_id = r.id
           AND i.status IN ('PENDING', 'APPROVED')
       ) ins ON true
       WHERE r.id = $1`,
      [room_id]
    );

    if (roomCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kambarys nerastas'
      });
    }

    const { capacity, occupied_beds, status, reserved_slots } = roomCheck.rows[0];

    const totalFreeBeds = capacity - (occupied_beds || 0);
    const availableBeds = totalFreeBeds - reserved_slots;

    if (availableBeds <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Kambaryje nebėra laisvų vietų'
      });
    }

    // Check if student already has pending or approved inspection
    const existingInspection = await query(
      `SELECT id FROM inspections 
       WHERE student_id = $1 AND status IN ('PENDING', 'APPROVED')`,
      [student_id]
    );

    if (existingInspection.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Jūs jau turite aktyvią kambario apžiūros užklausą'
      });
    }

    // Check if student already has a contract (DRAFT, SIGNED, ACTIVE)
    const existingContract = await query(
      `SELECT id FROM contracts 
      WHERE student_id = $1 
        AND status IN ('DRAFT', 'SIGNED', 'ACTIVE')`,
      [student_id]
    );

    if (existingContract.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Jūs jau turite aktyvią kambario rezervaciją'
      });
    }

    const result = await query(
      `INSERT INTO inspections (room_id, student_id, inspection_date, inspection_time, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING *`,
      [room_id, student_id, inspection_date, inspection_time]
    );

    // Update room status to RESERVED if this is first inspection reservation 
    const pendingCount = await query(
      `SELECT COUNT(*) as count FROM inspections 
       WHERE room_id = $1 AND status IN ('PENDING', 'APPROVED')`,
      [room_id]
    );

    if (parseInt(pendingCount.rows[0].count, 10) === 1 && status === 'AVAILABLE') {
      await query(
        `UPDATE rooms SET status = 'RESERVED' WHERE id = $1`,
        [room_id]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Apžiūros užklausa sėkmingai pateikta! Laukite budėtojo patvirtinimo.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};

// @desc    Get inspections for supervisor
// @route   GET /api/inspections/supervisor
// @access  Private (Supervisor)
export const getSupervisorInspections = async (req, res) => {
  try {
    const result = await query(
      `SELECT i.*, 
              r.room_number, 
              r.capacity,
              r.occupied_beds,
              r.status as room_status,
              (r.capacity - COALESCE(r.occupied_beds, 0)) AS total_free_beds,
              COALESCE(ins.reserved_slots, 0) AS reserved_slots,
              GREATEST(
                (r.capacity - COALESCE(r.occupied_beds, 0)) - COALESCE(ins.reserved_slots, 0),
                0
              ) AS available_beds,
              d.name as dormitory_name,
              u.first_name, 
              u.last_name, 
              u.email,
              ci.phone
       FROM inspections i
       JOIN rooms r ON i.room_id = r.id
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS reserved_slots
         FROM inspections i2
         WHERE i2.room_id = r.id
           AND i2.status IN ('PENDING', 'APPROVED')
       ) ins ON true
       JOIN dormitories d ON r.dormitory_id = d.id
       JOIN users u ON i.student_id = u.id
       LEFT JOIN contact_information ci ON u.contact_id = ci.id
       ORDER BY i.inspection_date DESC, i.inspection_time DESC, i.created_at DESC`,
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get inspections error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};


// @desc    Change inspection status
// @route   PUT /api/inspections/:id/status
// @access  Private (Supervisor or Student for cancel)
export const updateInspectionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['APPROVED', 'REJECTED', 'CANCELED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Neteisinga būsena'
      });
    }

    // Get inspection details
    const inspectionRes = await query(
      `SELECT 
        i.student_id, 
        i.room_id,
        r.price AS room_price
      FROM inspections i
      JOIN rooms r ON i.room_id = r.id
      WHERE i.id = $1`,
      [id]
    );

    if (inspectionRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Apžiūra nerasta'
      });
    }

    const inspection = inspectionRes.rows[0];
    const isSupervisor = req.user.user_type === 'SUPERVISOR';
    const isStudent = req.user.user_type === 'STUDENT';

    // Teisių tikrinimas
    if (isStudent) {
      // studentas gali tik atšaukti savo apžiūrą
      if (status !== 'CANCELED') {
        return res.status(403).json({
          success: false,
          message: 'Studentas gali tik atšaukti savo apžiūrą'
        });
      }
      if (inspection.student_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Negalite keisti kito studento apžiūros'
        });
      }
    } else if (!isSupervisor) {
      return res.status(403).json({
        success: false,
        message: 'Neturite teisės keisti apžiūros būsenos'
      });
    }

    // Update inspection status
    if (isSupervisor) {
      await query(
        'UPDATE inspections SET status = $1, notes = $2, supervisor_id = $3 WHERE id = $4',
        [status, notes || null, req.user.id, id]
      );
    } else {
      // studento atšaukimas – tik status
      await query(
        'UPDATE inspections SET status = $1 WHERE id = $2',
        [status, id]
      );
    }

    // Jei budėtojas PATVIRTINO apžiūrą – automatiškai sukuriam DRAFT sutartį
    if (isSupervisor && status === 'APPROVED') {
      // Patikrinam, ar studentas jau neturi sutarties šiam kambariui
      const existingContract = await query(
        `SELECT id 
        FROM contracts 
        WHERE student_id = $1 
          AND room_id = $2 
          AND status IN ('DRAFT', 'SIGNED', 'ACTIVE')`,
        [inspection.student_id, inspection.room_id]
      );

      if (existingContract.rows.length === 0) {
        // Gauname sekos numerį iš DB
        const seqRes = await query(`SELECT nextval('contract_sequence') AS seq`);
        const seq = seqRes.rows[0].seq;

        // Sudarome kontrakto numerį CNT-0001 formatu
        const contractNumber = `CNT-${String(seq).padStart(4, '0')}`;

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 10);

        await query(
          `INSERT INTO contracts 
          (student_id, room_id, contract_number, start_date, end_date, monthly_price, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT')`,
          [
            inspection.student_id,
            inspection.room_id,
            contractNumber,
            startDate,
            endDate,
            inspection.room_price // iš SELECT viršuje
          ]
        );
      }
    }

    // Po pakeitimo perskaičiuojam kambario statusą
    await recalculateRoomStatus(inspection.room_id);

    const statusText =
      status === 'APPROVED'
        ? 'patvirtinta'
        : status === 'REJECTED'
        ? 'atmesta'
        : 'atšaukta';

    res.json({
      success: true,
      message: `Apžiūra ${statusText}`
    });
  } catch (error) {
    console.error('Update inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};

// @desc    Set resident attendance status
// @route   PUT /api/inspections/:id/attendance
// @access  Private (Resident)
export const setResidentAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { will_attend } = req.body;

    // Check if user is a resident of this room
    const inspection = await query(
      `SELECT i.room_id 
       FROM inspections i
       WHERE i.id = $1`,
      [id]
    );

    if (inspection.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Apžiūra nerasta'
      });
    }

    const isResident = await query(
      `SELECT c.id 
       FROM contracts c
       WHERE c.room_id = $1 AND c.student_id = $2 AND c.status = 'ACTIVE'`,
      [inspection.rows[0].room_id, req.user.id]
    );

    if (isResident.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Jūs nesate šio kambario gyventojas'
      });
    }

    await query(
      'UPDATE inspections SET resident_will_attend = $1 WHERE id = $2',
      [will_attend, id]
    );

    res.json({
      success: true,
      message: 'Buvimo būsena atnaujinta'
    });
  } catch (error) {
    console.error('Set attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};

// @desc    Get my upcoming inspections (for residents)
// @route   GET /api/inspections/my-visits
// @access  Private (Resident)
export const getMyUpcomingVisits = async (req, res) => {
  try {
    const result = await query(
      `SELECT i.*, 
              r.room_number, 
              u.first_name as student_first_name, 
              u.last_name as student_last_name,
              u.email as student_email
       FROM inspections i
       JOIN rooms r ON i.room_id = r.id
       JOIN users u ON i.student_id = u.id
       JOIN contracts c ON c.room_id = r.id AND c.student_id = $1
       WHERE i.status IN ('PENDING', 'APPROVED') 
       AND i.inspection_date >= CURRENT_DATE
       AND c.status = 'ACTIVE'
       ORDER BY i.inspection_date, i.inspection_time`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get visits error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};

// @desc    Get my inspection requests (for students)
// @route   GET /api/inspections/my
// @access  Private (Student)
export const getMyInspections = async (req, res) => {
  try {
    const result = await query(
      `SELECT i.*, 
              r.room_number,
              r.capacity,
              r.occupied_beds,
              r.price,
              r.status as room_status,
              d.name as dormitory_name
       FROM inspections i
       JOIN rooms r ON i.room_id = r.id
       JOIN dormitories d ON r.dormitory_id = d.id
       WHERE i.student_id = $1
       ORDER BY i.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get my inspections error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};
