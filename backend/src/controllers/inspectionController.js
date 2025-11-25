import { query } from '../config/database.js';

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

    // Check if room has available beds
    const roomCheck = await query(
      'SELECT capacity, occupied_beds, status FROM rooms WHERE id = $1',
      [room_id]
    );

    if (roomCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kambarys nerastas'
      });
    }

    const { capacity, occupied_beds, status } = roomCheck.rows[0];
    const availableBeds = capacity - (occupied_beds || 0);

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
        message: 'Jūs jau turite aktyvią apžiūros užklausą'
      });
    }

    const result = await query(
      `INSERT INTO inspections (room_id, student_id, inspection_date, inspection_time, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING *`,
      [room_id, student_id, inspection_date, inspection_time]
    );

    // Update room status to RESERVED if this is first reservation
    const pendingCount = await query(
      `SELECT COUNT(*) as count FROM inspections 
       WHERE room_id = $1 AND status IN ('PENDING', 'APPROVED')`,
      [room_id]
    );

    if (parseInt(pendingCount.rows[0].count) === 1 && status === 'AVAILABLE') {
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
    const supervisorId = req.user.id;

    // Find the dormitory assigned to this supervisor
    const dormResult = await query(
        "SELECT id FROM dormitories WHERE supervisor_id = $1",
        [supervisorId]
    );

    if (dormResult.rows.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    const dormitoryId = dormResult.rows[0].id;

    // Load only inspections for this dormitory
    const result = await query(
        `SELECT i.*, 
              r.room_number, 
              r.capacity,
              r.occupied_beds,
              r.status as room_status,
              (r.capacity - COALESCE(r.occupied_beds, 0)) as available_beds,
              d.name as dormitory_name,
              u.first_name, 
              u.last_name, 
              u.email,
              ci.phone
       FROM inspections i
       JOIN rooms r ON i.room_id = r.id
       JOIN dormitories d ON r.dormitory_id = d.id
       JOIN users u ON i.student_id = u.id
       LEFT JOIN contact_information ci ON u.contact_id = ci.id
       WHERE i.status = 'PENDING'
         AND r.dormitory_id = $1
       ORDER BY i.inspection_date, i.inspection_time`,
        [dormitoryId]
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


// @desc    Approve/Reject inspection
// @route   PUT /api/inspections/:id/status
// @access  Private (Supervisor)
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
    const inspection = await query(
      'SELECT student_id, room_id FROM inspections WHERE id = $1',
      [id]
    );

    if (inspection.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Apžiūra nerasta'
      });
    }

    // Update inspection status
    await query(
      'UPDATE inspections SET status = $1, notes = $2, supervisor_id = $3 WHERE id = $4',
      [status, notes, req.user.id, id]
    );

    // If rejected or canceled, check if we should update room status back to AVAILABLE
    if (status === 'REJECTED' || status === 'CANCELED') {
      const remainingPending = await query(
        `SELECT COUNT(*) as count FROM inspections 
         WHERE room_id = $1 AND status IN ('PENDING', 'APPROVED') AND id != $2`,
        [inspection.rows[0].room_id, id]
      );

      if (parseInt(remainingPending.rows[0].count) === 0) {
        // Check if room has any occupied beds
        const roomStatus = await query(
          'SELECT occupied_beds FROM rooms WHERE id = $1',
          [inspection.rows[0].room_id]
        );

        if ((roomStatus.rows[0].occupied_beds || 0) === 0) {
          await query(
            `UPDATE rooms SET status = 'AVAILABLE' WHERE id = $1`,
            [inspection.rows[0].room_id]
          );
        }
      }
    }

    const statusText = status === 'APPROVED' ? 'patvirtinta' : status === 'REJECTED' ? 'atmesta' : 'atšaukta';

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
