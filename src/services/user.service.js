const User = require('../models/user.model');
const { AppError } = require('../middlewares/error.middleware');

// Business logic for user-related operations
const findUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};

const checkEmailExists = async (email) => {
  const existingUser = await User.findOne({ email });
  return !!existingUser;
};

module.exports = {
  findUserById,
  checkEmailExists
};