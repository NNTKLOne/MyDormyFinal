import { query } from '../config/database.js';

// @desc    Get my contracts
// @route   GET /api/contracts/my
// @access  Private (Student)
export const getMyContracts = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        c.*,
        r.room_number,
        r.capacity,
        r.occupied_beds,
        r.floor,
        r.room_type,
        r.description as room_description,
        r.amenities,
        d.name as dormitory_name,
        d.address as dormitory_address
       FROM contracts c
       JOIN rooms r ON c.room_id = r.id
       JOIN dormitories d ON r.dormitory_id = d.id
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

// @desc    Get my current room (if I'm a resident)
// @route   GET /api/contracts/my-room
// @access  Private (Student)
export const getMyRoom = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        c.id as contract_id,
        c.contract_number,
        c.start_date,
        c.end_date,
        c.monthly_price,
        c.status as contract_status,
        c.signed_at,
        r.id as room_id,
        r.room_number,
        r.capacity,
        r.occupied_beds,
        r.floor,
        r.room_type,
        r.description,
        r.amenities,
        r.images,
        d.name as dormitory_name,
        d.address as dormitory_address,
        (
          SELECT json_agg(json_build_object(
            'id', u2.id,
            'first_name', u2.first_name,
            'last_name', u2.last_name,
            'email', u2.email
          ))
          FROM contracts c2
          JOIN users u2 ON u2.id = c2.student_id
          WHERE c2.room_id = r.id 
            AND c2.status IN ('ACTIVE', 'SIGNED')
            AND c2.student_id != $1
        ) as roommates
       FROM contracts c
       JOIN rooms r ON c.room_id = r.id
       JOIN dormitories d ON r.dormitory_id = d.id
       WHERE c.student_id = $1 
         AND c.status IN ('ACTIVE', 'SIGNED')
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Neturite aktyvios sutarties'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get my room error:', error);
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

    // Check if contract belongs to user and is DRAFT
    const contractCheck = await query(
      'SELECT c.*, r.capacity, r.occupied_beds FROM contracts c JOIN rooms r ON c.room_id = r.id WHERE c.id = $1 AND c.student_id = $2',
      [id, req.user.id]
    );

    if (contractCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sutartis nerasta'
      });
    }

    const contract = contractCheck.rows[0];

    if (contract.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Sutartis jau pasirašyta arba nebeaktyvi'
      });
    }

    // Check if room has available space (pagal occupied_beds)
    const availableBeds = contract.capacity - (contract.occupied_beds || 0);
    if (availableBeds <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Kambaryje nebėra laisvų vietų'
      });
    }

    // Update contract status to SIGNED
    await query(
      `UPDATE contracts 
       SET status = 'SIGNED', signed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    // Atnaujinam occupied_beds (1 daugiau)
    const newOccupiedBeds = (contract.occupied_beds || 0) + 1;
    await query(
      `UPDATE rooms 
       SET occupied_beds = $1
       WHERE id = $2`,
      [newOccupiedBeds, contract.room_id]
    );

    // Perskaičiuojam statusą pagal taisykles (jei visos vietos užimtos – OCCUPIED ir t.t.)
    await recalculateRoomStatus(contract.room_id);

    res.json({
      success: true,
      message: 'Sutartis sėkmingai pasirašyta!'
    });
  } catch (error) {
    console.error('Sign contract error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};