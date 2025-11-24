import { query } from '../config/database.js';

// @desc    Get my contracts
// @route   GET /api/contracts/my
// @access  Private (Student)
export const getMyContracts = async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, rm.room_number, d.name as dormitory_name
       FROM contracts c
       JOIN rooms rm ON c.room_id = rm.id
       JOIN dormitories d ON rm.dormitory_id = d.id
       WHERE c.student_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get contracts error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};

// @desc    Sign contract
// @route   PUT /api/contracts/:id/sign
// @access  Private (Student)
export const signContract = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if contract belongs to user
    const contract = await query(
      'SELECT * FROM contracts WHERE id = $1 AND student_id = $2',
      [id, req.user.id]
    );

    if (contract.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sutartis nerasta'
      });
    }

    if (contract.rows[0].status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Sutartis jau pasirašyta arba neaktyvi'
      });
    }

    // Update contract
    await query(
      `UPDATE contracts 
       SET status = 'SIGNED', signed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    // Update room status to OCCUPIED
    await query(
      `UPDATE rooms 
       SET status = 'OCCUPIED', occupied_beds = occupied_beds + 1
       WHERE id = $1`,
      [contract.rows[0].room_id]
    );

    // Create notification
    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [
        req.user.id,
        'Sutartis pasirašyta',
        'Jūsų apgyvendinimo sutartis sėkmingai pasirašyta!',
        'CONTRACT'
      ]
    );

    res.json({
      success: true,
      message: 'Sutartis sėkmingai pasirašyta'
    });
  } catch (error) {
    console.error('Sign contract error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};
