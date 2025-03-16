const jwt = require('jsonwebtoken');

// Generate access token (1 hour)
exports.generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });
};

// Generate refresh token (7 days)
exports.generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};