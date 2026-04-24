const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

/**
 * =============================================
 * USER MANAGEMENT ROUTES (Librarian Only)
 * =============================================
 * All routes below: GET/PUT/DELETE /api/users/...
 */

// GET /api/users - Librarian can view all users with their roles
router.get('/', protect, authorize('librarian'), async (req, res) => {
  try {
    const users = await User.find().select('-password -resetToken -resetTokenExpiry').sort({ createdAt: -1 });
    res.json({ message: 'All users', count: users.length, users });
  } catch (error) {
    console.error('Get users error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/:id - Librarian can view a specific user
router.get('/:id', protect, authorize('librarian'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      '-password -resetToken -resetTokenExpiry'
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/:id - Librarian can update user info (name, email, grade, status)
router.put('/:id', protect, authorize('librarian'), async (req, res) => {
  try {
    const { name, email, grade, class: classField, stream, status } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (grade !== undefined) user.grade = grade;
    if (classField !== undefined) user.class = classField;
    if (stream !== undefined) user.stream = stream;
    if (status) {
      const validStatuses = ['pending', 'active', 'rejected'];
      if (validStatuses.includes(status)) user.status = status;
    }

    await user.save();
    res.json({ message: 'User updated', user: { name: user.name, email: user.email, grade: user.grade, class: user.class, stream: user.stream, status: user.status, role: user.role, memberId: user.memberId } });
  } catch (error) {
    console.error('Update user error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/:id/role - Librarian can change user role
router.put('/:id/role', protect, authorize('librarian'), async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['student', 'teacher', 'librarian'];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Role must be: student, teacher, or librarian' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent librarian from demoting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }

    user.role = role;
    await user.save();

    res.json({ message: `User role changed to "${role}"`, user: { name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Change role error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/users/:id - Librarian can delete a user
router.delete('/:id', protect, authorize('librarian'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent librarian from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete yourself' });
    }

    await user.deleteOne();
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
