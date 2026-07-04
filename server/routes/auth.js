const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { protect, authorize, checkRole } = require('../middleware/auth');

// ------------------------------------------
// Configure email transporter (Gmail)
// ------------------------------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ------------------------------------------
// POST /api/auth/register
// Anyone can register (default role: student)
// New registrations are set to 'pending' status
// ------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, grade, class: classSection, stream } = req.body;

    // Validate role
    const validRoles = ['student', 'teacher', 'librarian'];
    const userRole = role || 'student';
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({ message: 'Invalid role. Must be: student, teacher, or librarian' });
    }

    // Prevent self-registration of librarian accounts
    if (userRole === 'librarian') {
      return res.status(403).json({ message: 'Librarian accounts cannot be created through registration. Contact system administrator.' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
      grade: grade || '',
      class: classSection || '',
      stream: stream || '',
      status: 'pending', // New users start as pending
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      token: await generateToken(user._id),
      message: 'Registration successful! Your account is pending librarian approval.',
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ------------------------------------------
// POST /api/auth/login/student
// Only student accounts can login
// ------------------------------------------
router.post('/login/student', checkRole('student'), (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    token: req.token,
  });
});

// ------------------------------------------
// POST /api/auth/login/teacher
// Only teacher accounts can login
// ------------------------------------------
router.post('/login/teacher', checkRole('teacher'), (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    token: req.token,
  });
});

// ------------------------------------------
// POST /api/auth/login/librarian
// Only librarian accounts can login
// ------------------------------------------
router.post('/login/librarian', checkRole('librarian'), (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    token: req.token,
  });
});

// ------------------------------------------
// GET /api/auth/me
// Get current authenticated user profile
// ------------------------------------------
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -resetToken -resetTokenExpiry');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------------------------------
// PUT /api/auth/me
// Update current authenticated user profile
// ------------------------------------------
router.put('/me', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: req.body.name || undefined, grade: req.body.grade || '' },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update profile' });
  }
});

// ------------------------------------------
// POST /api/auth/forgot-password
// Send reset email
// ------------------------------------------
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: `"School Library System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;">
        <h2 style="color:#1a2744;">Password Reset</h2>
        <p>Hello ${user.name},</p>
        <p>Click below to reset your password:</p>
        <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#1a2744;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Reset Password</a>
        <p style="margin-top:20px;font-size:12px;color:#888;">Link expires in 1 hour.</p>
      </div>`,
    });

    res.json({ message: 'Reset link sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ message: 'Failed to send reset email' });
  }
});

// ------------------------------------------
// POST /api/auth/reset-password
// Reset password using token
// ------------------------------------------
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = newPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

// ------------------------------------------
// Helper: generate JWT
// ------------------------------------------
const jwt = require('jsonwebtoken');

async function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'jwtsecret123', { expiresIn: '7d' });
}

// ===========================
// PENDING REGISTRATION ROUTES (Librarian Only)
// ===========================

// GET /api/auth/pending - Librarians view all pending registrations
router.get('/pending', protect, authorize('librarian'), async (req, res) => {
  try {
    const pendingUsers = await User.find({ status: 'pending' })
      .select('-password -resetToken -resetTokenExpiry')
      .sort({ createdAt: -1 });

    res.json({ users: pendingUsers, count: pendingUsers.length });
  } catch (error) {
    console.error('Get pending users error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/approve/:id - Librarian approves a pending user
router.put('/approve/:id', protect, authorize('librarian'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.status !== 'pending') {
      return res.status(400).json({
        message: `User is already ${user.status}. Cannot approve.`,
      });
    }

    user.status = 'active';
    user.rejectionReason = '';
    await user.save();

    // Send notification
    const { createNotification } = require('../utils/notificationsHelper');
    await createNotification({
      recipient: user._id,
      type: 'registration_approved',
      message: `Your registration has been approved by ${req.user.name}. You can now login.`,
    });

    // Return user without password
    const userResponse = await User.findById(user._id).select('-password -resetToken -resetTokenExpiry');

    res.json({
      message: `User ${user.name} approved successfully`,
      user: userResponse,
    });
  } catch (error) {
    console.error('Approve user error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/reject/:id - Librarian rejects a pending user
router.put('/reject/:id', protect, authorize('librarian'), async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.status !== 'pending') {
      return res.status(400).json({
        message: `User is already ${user.status}. Cannot reject.`,
      });
    }

    user.status = 'rejected';
    user.rejectionReason = reason || 'Application rejected';
    await user.save();

    // Send notification
    const { createNotification } = require('../utils/notificationsHelper');
    await createNotification({
      recipient: user._id,
      type: 'registration_rejected',
      message: `Your registration was rejected. Reason: ${reason || 'Application rejected'}`,
    });

    // Return user without password
    const userResponse = await User.findById(user._id).select('-password -resetToken -resetTokenExpiry');

    res.json({
      message: `User ${user.name} rejected`,
      user: userResponse,
    });
  } catch (error) {
    console.error('Reject user error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------------------------------
// PUT /api/auth/change-password
// Change password using current password
// ------------------------------------------
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Fetch user including password hash
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword; // User model pre-save hook will hash it
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
