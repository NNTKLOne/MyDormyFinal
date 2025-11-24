import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Prašome įvesti el. paštą ir slaptažodį'
      });
    }

    // Check if user exists
    const result = await query(
      `SELECT u.*, ci.phone, ci.address 
       FROM users u 
       LEFT JOIN contact_information ci ON u.contact_id = ci.id 
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Neteisingas el. paštas arba slaptažodis'
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Paskyra neaktyvi. Susisiekite su administratoriumi.'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Neteisingas el. paštas arba slaptažodis'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
    delete user.password_hash;

    res.json({
      success: true,
      message: 'Sėkmingai prisijungėte',
      data: {
        user,
        token,
        mustChangePassword: user.must_change_password
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida prisijungiant'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.user_type, 
              u.faculty, u.study_program, u.student_id, u.is_active,
              ci.phone, ci.address
       FROM users u 
       LEFT JOIN contact_information ci ON u.contact_id = ci.id 
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vartotojas nerastas'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Prašome įvesti abu slaptažodžius'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Naujas slaptažodis turi būti bent 6 simbolių ilgio'
      });
    }

    // Get user with password
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Neteisingas dabartinis slaptažodis'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    res.json({
      success: true,
      message: 'Slaptažodis sėkmingai pakeistas'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida keičiant slaptažodį'
    });
  }
};

// @desc    Logout user (client-side token deletion)
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Sėkmingai atsijungėte'
  });
};
