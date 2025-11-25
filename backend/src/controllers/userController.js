import { query } from '../config/database.js';
import bcrypt from 'bcrypt';

// Generate random password
const generatePassword = () => {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// @desc    Create new user with contact information
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

    if (!first_name || !last_name || !email || !user_type) {
      return res.status(400).json({
        success: false,
        message: 'Prašome užpildyti visus privalomus laukus'
      });
    }

    // Check if email already exists in users
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Vartotojas su šiuo el. paštu jau egzistuoja'
      });
    }

    // Generate temporary password
    const temporaryPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Create contact information first
    const contactResult = await query(
      `INSERT INTO contact_information (phone, email, address) 
       VALUES ($1, $2, $3) 
       RETURNING id`,
      [phone || null, email, address || null]
    );
    const contact_id = contactResult.rows[0].id;

    // Create user with all fields
    const result = await query(
      `INSERT INTO users 
       (first_name, last_name, email, password_hash, user_type, 
        contact_id, faculty, study_program, student_id, 
        is_active, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, true)
       RETURNING id, first_name, last_name, email, user_type, 
                 faculty, study_program, student_id, is_active`,
      [
        first_name,
        last_name,
        email,
        hashedPassword,
        user_type,
        contact_id,
        faculty || null,
        study_program || null,
        student_id || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Vartotojas sėkmingai sukurtas',
      data: {
        user: result.rows[0],
        temporaryPassword: temporaryPassword
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida kuriant vartotoją'
    });
  }
};

// @desc    Get all users with contact information
// @route   GET /api/users
// @access  Private (University Admin, Dormitory Admin)
export const getAllUsers = async (req, res) => {
  try {
    const { user_type } = req.query;

    let queryText = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.user_type,
        u.faculty,
        u.study_program,
        u.student_id,
        u.is_active,
        u.must_change_password,
        u.created_at,
        ci.phone,
        ci.address
      FROM users u
      LEFT JOIN contact_information ci ON u.contact_id = ci.id
      WHERE 1=1
    `;

    const params = [];
    if (user_type) {
      queryText += ' AND u.user_type = $1';
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
// @access  Private (University Admin)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      user_type,
      faculty,
      study_program,
      student_id,
      is_active,
      phone,
      address
    } = req.body;

    // Get user's contact_id
    const userResult = await query(
      'SELECT contact_id FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vartotojas nerastas'
      });
    }

    const contact_id = userResult.rows[0].contact_id;

    // Update contact information
    if (contact_id) {
      await query(
        'UPDATE contact_information SET phone = $1, address = $2 WHERE id = $3',
        [phone || null, address || null, contact_id]
      );
    }

    // Update user
    const result = await query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           email = COALESCE($3, email),
           user_type = COALESCE($4, user_type),
           faculty = COALESCE($5, faculty),
           study_program = COALESCE($6, study_program),
           student_id = COALESCE($7, student_id),
           is_active = COALESCE($8, is_active)
       WHERE id = $9
       RETURNING id, first_name, last_name, email, user_type, 
                 faculty, study_program, student_id, is_active`,
      [
        first_name,
        last_name,
        email,
        user_type,
        faculty,
        study_program,
        student_id,
        is_active,
        id
      ]
    );

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
// @access  Private (University Admin)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has active contracts
    const contractCheck = await query(
      "SELECT COUNT(*) as count FROM contracts WHERE student_id = $1 AND status IN ('ACTIVE', 'SIGNED')",
      [id]
    );

    if (parseInt(contractCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Negalima ištrinti vartotojo su aktyvia sutartimi'
      });
    }

    // Get contact_id before deleting user
    const userResult = await query(
      'SELECT contact_id FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vartotojas nerastas'
      });
    }

    const contact_id = userResult.rows[0].contact_id;

    // Delete user (CASCADE will handle related records)
    await query('DELETE FROM users WHERE id = $1', [id]);

    // Delete contact information if exists
    if (contact_id) {
      await query('DELETE FROM contact_information WHERE id = $1', [contact_id]);
    }

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
