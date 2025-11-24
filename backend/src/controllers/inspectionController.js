import { query } from '../config/database.js';

// @desc    Create inspection appointment
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

    const result = await query(
      `INSERT INTO inspections (room_id, student_id, inspection_date, inspection_time, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING *`,
      [room_id, student_id, inspection_date, inspection_time]
    );

    // Notify resident
    const roomResidents = await query(
      `SELECT DISTINCT c.student_id 
       FROM contracts c 
       WHERE c.room_id = $1 AND c.status = 'ACTIVE'`,
      [room_id]
    );

    for (const resident of roomResidents.rows) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          resident.student_id,
          'Planuojamas apsilankymas',
          `Suplanuotas kambario apsilankymas ${inspection_date} ${inspection_time}. Prašome patvirtinti ar būsite.`,
          'INSPECTION',
          'inspection',
          result.rows[0].id
        ]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Apžiūros laikas užregistruotas',
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
      `SELECT i.*, r.room_number, d.name as dormitory_name,
              u.first_name, u.last_name, u.email
       FROM inspections i
       JOIN rooms r ON i.room_id = r.id
       JOIN dormitories d ON r.dormitory_id = d.id
       JOIN users u ON i.student_id = u.id
       WHERE i.status = 'PENDING'
       ORDER BY i.inspection_date, i.inspection_time`,
      []
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

    await query(
      'UPDATE inspections SET status = $1, notes = $2, supervisor_id = $3 WHERE id = $4',
      [status, notes, req.user.id, id]
    );

    // Notify student
    const inspection = await query(
      'SELECT student_id FROM inspections WHERE id = $1',
      [id]
    );

    const statusText = status === 'APPROVED' ? 'patvirtinta' : 'atmesta';
    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [
        inspection.rows[0].student_id,
        `Apžiūra ${statusText}`,
        `Jūsų apžiūros užklausa buvo ${statusText}.`,
        'INSPECTION'
      ]
    );

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

    await query(
      'UPDATE inspections SET resident_will_attend = $1 WHERE id = $2',
      [will_attend, id]
    );

    res.json({
      success: true,
      message: 'Būsena atnaujinta'
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
// @access  Private
export const getMyUpcomingVisits = async (req, res) => {
  try {
    const result = await query(
      `SELECT i.*, r.room_number, u.first_name as student_first_name, 
              u.last_name as student_last_name
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
