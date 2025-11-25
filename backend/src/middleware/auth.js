import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Nepateiktas autentifikacijos token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
        'SELECT id, email, user_type, is_active FROM users WHERE id = $1',
        [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Vartotojas nerastas'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Paskyra neaktyvi'
      });
    }

    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token galiojimas baigėsi'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Netinkamas token'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Autentifikacijos klaida'
    });
  }
};

// Existing authorize middleware (keep it)
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Neprisijungęs vartotojas'
      });
    }

    if (!roles.includes(req.user.user_type)) {
      return res.status(403).json({
        success: false,
        message: 'Neturite teisių atlikti šį veiksmą'
      });
    }

    next();
  };
};

// NEW: requireRole to match adminRoutes expected name
export const requireRole = (rolesArray) => {
  return authorize(...rolesArray);
};
