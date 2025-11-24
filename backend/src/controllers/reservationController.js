import { query } from '../config/database.js';

// @desc    Create reservation
// @route   POST /api/reservations
// @access  Private (Student)
export const createReservation = async (req, res) => {
  try {
    const { room_id, start_date, end_date } = req.body;
    const student_id = req.user.id;

    // Validation
    if (!room_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Prašome užpildyti visus laukus'
      });
    }

    // Check if room is available
    const roomCheck = await query(
      'SELECT status FROM rooms WHERE id = $1',
      [room_id]
    );

    if (roomCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kambarys nerastas'
      });
    }

    if (roomCheck.rows[0].status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        message: 'Kambarys nebeprieinamas'
      });
    }

    // Create reservation
    const result = await query(
      `INSERT INTO reservations (student_id, room_id, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, 'PENDING_APPROVAL')
       RETURNING *`,
      [student_id, room_id, start_date, end_date]
    );

    // Update room status to RESERVED
    await query(
      "UPDATE rooms SET status = 'RESERVED' WHERE id = $1",
      [room_id]
    );

    // Create notification
    await query(
      `INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        student_id,
        'Rezervacija sukurta',
        `Sėkmingai rezervavote kambarį. Laukiama patvirtinimo.`,
        'RESERVATION',
        'reservation',
        result.rows[0].id
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Rezervacija sėkmingai sukurta',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida kuriant rezervaciją'
    });
  }
};

// @desc    Get user's reservations
// @route   GET /api/reservations/my
// @access  Private
export const getMyReservations = async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, rm.room_number, rm.price, d.name as dormitory_name
       FROM reservations r
       JOIN rooms rm ON r.room_id = rm.id
       JOIN dormitories d ON rm.dormitory_id = d.id
       WHERE r.student_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};

// @desc    Cancel reservation
// @route   DELETE /api/reservations/:id
// @access  Private
export const cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;

    // Get reservation
    const reservation = await query(
      'SELECT * FROM reservations WHERE id = $1 AND student_id = $2',
      [id, req.user.id]
    );

    if (reservation.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rezervacija nerasta'
      });
    }

    // Update reservation status
    await query(
      "UPDATE reservations SET status = 'CANCELED' WHERE id = $1",
      [id]
    );

    // Update room status back to AVAILABLE
    await query(
      "UPDATE rooms SET status = 'AVAILABLE' WHERE id = $1",
      [reservation.rows[0].room_id]
    );

    res.json({
      success: true,
      message: 'Rezervacija atšaukta'
    });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};
