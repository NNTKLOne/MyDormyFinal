export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validacijos klaida',
      errors
    });
  }

  // PostgreSQL unique constraint error
  if (err.code === '23505') {
    return res.status(400).json({
      success: false,
      message: 'Toks įrašas jau egzistuoja'
    });
  }

  // PostgreSQL foreign key constraint error
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Nurodytas objektas nerastas'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Netinkamas token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token galiojimas baigėsi'
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Serverio klaida',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};
