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

// ================================================
// CREATE USER
// ================================================
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
      address,
      assigned_dormitory_id
    } = req.body;

    if (!first_name || !last_name || !email || !user_type) {
      return res.status(400).json({
        success: false,
        message: 'Prašome užpildyti visus privalomus laukus'
      });
    }

    // Check if email exists
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

    // Generate password
    const temporaryPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Create contact info
    const contactResult = await query(
        `INSERT INTO contact_information (phone, email, address)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [phone || null, email, address || null]
    );
    const contact_id = contactResult.rows[0].id;

    // Insert user
    const userResult = await query(
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

    const newUser = userResult.rows[0];

    // ============================================
    // ASSIGN ADMIN / SUPERVISOR TO DORMITORY
    // AND UPDATE contact_id 💡
    // ============================================
    if (assigned_dormitory_id) {
      if (user_type === "SUPERVISOR") {
        await query(
            "UPDATE dormitories SET supervisor_id = $1 WHERE id = $2",
            [newUser.id, assigned_dormitory_id]
        );
      }

      if (user_type === "DORMITORY_ADMIN") {
        await query(
            "UPDATE dormitories SET admin_id = $1, contact_id = $2 WHERE id = $3",
            [newUser.id, contact_id, assigned_dormitory_id]  // 🔧 FIX ADDED
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Vartotojas sėkmingai sukurtas',
      data: {
        user: newUser,
        temporaryPassword
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

// ================================================
// GET ALL USERS
// ================================================
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

// ================================================
// UPDATE USER
// ================================================
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
      address,
      assigned_dormitory_id
    } = req.body;

    // Get contact_id
    const userData = await query(
        'SELECT contact_id FROM users WHERE id = $1',
        [id]
    );

    if (userData.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vartotojas nerastas'
      });
    }

    const contact_id = userData.rows[0].contact_id;

    // Update contact info
    await query(
        'UPDATE contact_information SET phone = $1, address = $2 WHERE id = $3',
        [phone || null, address || null, contact_id]
    );

    // Update user
    const updatedUser = await query(
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

    // ============================================
    // UPDATE ADMIN / SUPERVISOR RELATIONSHIP
    // ============================================
    if (assigned_dormitory_id) {
      if (user_type === "SUPERVISOR") {
        await query(
            "UPDATE dormitories SET supervisor_id = $1 WHERE id = $2",
            [id, assigned_dormitory_id]
        );
      }

      if (user_type === "DORMITORY_ADMIN") {
        await query(
            "UPDATE dormitories SET admin_id = $1, contact_id = $2 WHERE id = $3",
            [id, contact_id, assigned_dormitory_id] // 🔧 FIX ADDED
        );
      }
    }

    res.json({
      success: true,
      message: 'Vartotojas atnaujintas',
      data: updatedUser.rows[0]
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

    // Check active contracts
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

    // Get contact_id and user type
    const userResult = await query(
        'SELECT contact_id, user_type FROM users WHERE id = $1',
        [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vartotojas nerastas'
      });
    }

    const { contact_id, user_type } = userResult.rows[0];

    // ===============================
    //   REMOVE ASSIGNMENTS ONLY IF ADMIN
    // ===============================
    if (user_type === "DORMITORY_ADMIN") {
      await query(
          `UPDATE dormitories 
         SET admin_id = NULL,
             contact_id = NULL 
         WHERE admin_id = $1`,
          [id]  // Only admin_id is cleared! 🔧 FIXED
      );
    }

    // Delete user
    await query('DELETE FROM users WHERE id = $1', [id]);

    // Delete contact info
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
