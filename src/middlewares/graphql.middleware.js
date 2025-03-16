const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { AppError } = require('./error.middleware');

// Create context for GraphQL requests
const graphqlContext = async (req) => {
  try {
    // Get token from authorization header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return { user: null };
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return { user: null };
    }

    // Check if user changed password after token was issued
    if (user.changeCredentialTime && decoded.iat) {
      const changedTimestamp = parseInt(user.changeCredentialTime.getTime() / 1000, 10);
      
      if (decoded.iat < changedTimestamp) {
        return { user: null };
      }
    }

    // Check if user is confirmed, not banned, not deleted
    if (!user.isConfirmed || user.bannedAt || user.deletedAt) {
      return { user: null };
    }

    // Return user in context
    return { user };
  } catch (err) {
    return { user: null };
  }
};

module.exports = { graphqlContext };