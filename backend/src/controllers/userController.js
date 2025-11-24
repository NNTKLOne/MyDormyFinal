import bcrypt from 'bcrypt';
import { query } from '../config/database.js';

// @desc    Create new user account
// @route   POST /api/users
// @access  Private (University Admin)
export const createUser = async (req, res) => {
  try {
    const { 
      first_name, 
      last_name, 
      email, 
      user_type,
      faculty,
      study_program,
      student_id,
      phone,
      address
    } = req.body;

    // Validation
    if (!first_name || !last_name || !email || !user_type) {
      return res.status(400).json({
        success: false,
        message: 'Prašome užpildyti visus privalomus laukus'
      });
    }

    // Check if email already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Vartotojas su tokiu el. paštu jau egzistuoja'
      });
    }

    // Generate temporary password
    const tempPassword = 'Welcome123!';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create contact information if provided
    let contactId = null;
    if (phone || address) {
      const contactResult = await query(
        'INSERT INTO contact_information (phone, email, address) VALUES ($1, $2, $3) RETURNING id',
        [phone, email, address]
      );
      contactId = contactResult.rows[0].id;
    }

    // Create user
    const result = await query(
      `INSERT INTO users 
       (first_name, last_name, email, password_hash, user_type, contact_id, 
        faculty, study_program, student_id, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       RETURNING id, first_name, last_name, email, user_type`,
      [first_name, last_name, email, hashedPassword, user_type, contactId,
       faculty, study_program, student_id]
    );

    // Send notification to new user
    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [
        result.rows[0].id,
        'Paskyra sukurta',
        `Sveiki atvykę į MyDormy sistemą! Jūsų laikinas slaptažodis: ${tempPassword}. Prašome jį pakeisti pirmą kartą prisijungus.`,
        'INFO'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Paskyra sėkmingai sukurta',
      data: {
        user: result.rows[0],
        temporaryPassword: tempPassword
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida kuriant paskyrą'
    });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
export const getAllUsers = async (req, res) => {
  try {
    const { user_type } = req.query;

    let queryText = `
      SELECT u.id, u.first_name, u.last_name, u.email, u.user_type, 
             u.faculty, u.study_program, u.student_id, u.is_active,
             ci.phone, ci.address
      FROM users u
      LEFT JOIN contact_information ci ON u.contact_id = ci.id
    `;

    const params = [];
    if (user_type) {
      queryText += ' WHERE u.user_type = $1';
      params.push(user_type);
    }

    queryText += ' ORDER BY u.created_at DESC';

    const result = await query(queryText, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, faculty, study_program, is_active } = req.body;

    const result = await query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           faculty = COALESCE($3, faculty),
           study_program = COALESCE($4, study_program),
           is_active = COALESCE($5, is_active)
       WHERE id = $6
       RETURNING id, first_name, last_name, email, user_type`,
      [first_name, last_name, faculty, study_program, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vartotojas nerastas'
      });
    }

    res.json({
      success: true,
      message: 'Vartotojas atnaujintas',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Vartotojas ištrintas'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};
