const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// @desc    Update profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.name = req.body.name || user.name;
  if (req.body.email && req.body.email !== user.email) {
    res.status(400);
    throw new Error('Email cannot be changed');
  }
  user.avatar = req.body.avatar ?? user.avatar;
  if (req.body.address) {
    user.address = { ...user.address?.toObject?.(), ...req.body.address };
  }
  if (req.body.password) {
    user.password = req.body.password;
  }

  const updated = await user.save();
  res.json({
    success: true,
    user: {
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      avatar: updated.avatar,
      address: updated.address,
    },
  });
});

// @desc    Get all users (admin)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, users });
});

// @desc    Delete user (admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user.role === 'admin') {
    res.status(400);
    throw new Error('Cannot delete admin user');
  }
  await user.deleteOne();
  res.json({ success: true, message: 'User removed' });
});

module.exports = { updateProfile, getUsers, deleteUser };
