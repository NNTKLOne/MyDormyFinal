import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

import { authMiddleware } from './middleware/auth.js';
import { forcePasswordChange } from './middleware/forcePasswordChange.js';

import { errorHandler, notFound } from './middleware/errorHandler.js';
import pool from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'MyDormy API is running!',
    timestamp: new Date().toISOString()
  });
});

/*
===========================================================
   GLOBAL AUTH + PASSWORD CHANGE ENFORCEMENT
===========================================================
*/

/// Leisti tik login
const isPublicAuthRoute = (req) =>
    req.path.startsWith("/api/auth/login");

// Global middleware
app.use((req, res, next) => {

  if (isPublicAuthRoute(req)) return next();

  // Tikrinam token
  authMiddleware(req, res, () => {

    // Tikrinam must-change-password
    forcePasswordChange(req, res, next);
  });
});


/*
===========================================================
   API ROUTES (po global auth filterio)
===========================================================
*/

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/admin', adminRoutes);

/*
===========================================================
   ERROR HANDLING
===========================================================
*/
app.use(notFound);
app.use(errorHandler);

/*
===========================================================
   START SERVER
===========================================================
*/
const startServer = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');

    app.listen(PORT, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🚀 MyDormy Server running on port ${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
