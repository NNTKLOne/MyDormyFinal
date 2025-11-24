import { query } from '../config/database.js';

// @desc    Submit housing request
// @route   POST /api/requests
// @access  Private (Student)
export const submitRequest = async (req, res) => {
  try {
    const { room_id, documents } = req.body;
    const student_id = req.user.id;

    if (!room_id) {
      return res.status(400).json({
        success: false,
        message: 'Prašome pasirinkti kambarį'
      });
    }

    // Check if student already has active request
    const existingRequest = await query(
      `SELECT id FROM requests 
       WHERE student_id = $1 AND status IN ('SUBMITTED', 'UNDER_REVIEW')`,
      [student_id]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Jūs jau turite aktyvų prašymą'
      });
    }

    const result = await query(
      `INSERT INTO requests (student_id, room_id, status, documents)
       VALUES ($1, $2, 'SUBMITTED', $3)
       RETURNING *`,
      [student_id, room_id, JSON.stringify(documents || {})]
    );

    // Notify admins
    const admins = await query(
      "SELECT id FROM users WHERE user_type = 'UNIVERSITY_ADMIN'"
    );

    for (const admin of admins.rows) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          admin.id,
          'Naujas prašymas',
          'Gautas naujas apgyvendinimo prašymas peržiūrai.',
          'REQUEST',
          'request',
          result.rows[0].id
        ]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Prašymas sėkmingai pateiktas',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Submit request error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};

// @desc    Get all requests (for admin)
// @route   GET /api/requests
// @access  Private (Admin)
export const getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;

    let queryText = `
      SELECT r.*, 
             u.first_name, u.last_name, u.email, u.faculty, u.study_program,
             rm.room_number, d.name as dormitory_name
      FROM requests r
      JOIN users u ON r.student_id = u.id
      JOIN rooms rm ON r.room_id = rm.id
      JOIN dormitories d ON rm.dormitory_id = d.id
    `;

    const params = [];
    if (status) {
      queryText += ' WHERE r.status = $1';
      params.push(status);
    }

    queryText += ' ORDER BY r.submitted_at DESC';

    const result = await query(queryText, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};

// @desc    Get my requests
// @route   GET /api/requests/my
// @access  Private (Student)
export const getMyRequests = async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, rm.room_number, d.name as dormitory_name, rm.price
       FROM requests r
       JOIN rooms rm ON r.room_id = rm.id
       JOIN dormitories d ON rm.dormitory_id = d.id
       WHERE r.student_id = $1
       ORDER BY r.submitted_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};

// @desc    Approve/Reject request
// @route   PUT /api/requests/:id/status
// @access  Private (Admin)
export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Neteisinga būsena'
      });
    }

    const result = await query(
      `UPDATE requests 
       SET status = $1, rejection_reason = $2, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $3
       WHERE id = $4
       RETURNING student_id, room_id`,
      [status, rejection_reason, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prašymas nerastas'
      });
    }

    const { student_id, room_id } = result.rows[0];

    // If approved, create contract
    if (status === 'APPROVED') {
      const roomInfo = await query(
        'SELECT price FROM rooms WHERE id = $1',
        [room_id]
      );

      const contractNumber = `CONTRACT-${Date.now()}`;
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);

      await query(
        `INSERT INTO contracts (request_id, student_id, room_id, contract_number, 
                                start_date, end_date, monthly_price, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT')`,
        [id, student_id, room_id, contractNumber, startDate, endDate, roomInfo.rows[0].price]
      );
    }

    // Notify student
    const statusText = status === 'APPROVED' ? 'patvirtintas' : 'atmestas';
    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [
        student_id,
        `Prašymas ${statusText}`,
        status === 'APPROVED' 
          ? 'Jūsų prašymas patvirtintas! Galite pasirašyti sutartį.' 
          : `Jūsų prašymas atmestas. Priežastis: ${rejection_reason || 'Nenurodyta'}`,
        'REQUEST'
      ]
    );

    res.json({
      success: true,
      message: `Prašymas ${statusText}`
    });
  } catch (error) {
    console.error('Update request status error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};
