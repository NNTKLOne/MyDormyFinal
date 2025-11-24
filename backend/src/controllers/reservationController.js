import { query } from '../config/database.js';

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

    // Update room status
    await query(
      "UPDATE rooms SET status = 'RESERVED' WHERE id = $1",
      [room_id]
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