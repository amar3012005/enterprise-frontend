const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Initialize Twilio client only if credentials are available
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  const twilio = require('twilio');
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTPs temporarily (in production, use Redis)
const otpStore = new Map();

// Send OTP via SMS
const sendOTP = async (phoneNumber, otp) => {
  if (!twilioClient) {
    console.log('Twilio not configured, skipping SMS');
    return true;
  }

  try {
    await twilioClient.messages.create({
      body: `Your I N D U S verification code is: ${otp}. Valid for 10 minutes.`,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });
    return true;
  } catch (error) {
    console.error('Error sending OTP:', error);
    return false;
  }
};

// Request OTP
exports.requestOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const otp = generateOTP();
    otpStore.set(phoneNumber, {
      code: otp,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    const sent = await sendOTP(phoneNumber, otp);
    if (!sent) {
      return res.status(500).json({ message: 'Failed to send OTP' });
    }

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error in requestOTP:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify OTP and Register/Login
exports.verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, otp, role, preferredLanguage } = req.body;
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const storedOTP = otpStore.get(phoneNumber);
    if (!storedOTP || storedOTP.code !== otp || Date.now() > storedOTP.expires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP after successful verification
    otpStore.delete(phoneNumber);

    // Find or create user
    let user = await User.findOne({ phoneNumber });
    if (!user) {
      user = new User({
        phoneNumber,
        role,
        preferredLanguage
      });
      await user.save();
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'OTP verified successfully',
      token,
      user: {
        id: user._id,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Error in verifyOTP:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-phoneNumber')
      .populate('social.connections', 'profile.name profile.skills');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { profile, preferredLanguage } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (profile) {
      user.profile = { ...user.profile, ...profile };
    }

    if (preferredLanguage) {
      user.preferredLanguage = preferredLanguage;
    }

    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Error in updateProfile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Register a new user
exports.register = async (req, res) => {
  try {
    const { email, password, role, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      role,
      profile: { name }
    });

    if (req.device) {
      user.devices.push({
        deviceId: req.device.id,
        platform: req.device.platform,
        appVersion: req.device.version,
        lastSeenAt: new Date()
      });
    }

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

// Helper to update device info
const updateDeviceLogin = async (user, deviceInfo) => {
  if (!deviceInfo || !deviceInfo.id) return;

  const existingDeviceIndex = user.devices.findIndex(d => d.deviceId === deviceInfo.id);
  
  if (existingDeviceIndex > -1) {
    user.devices[existingDeviceIndex].lastSeenAt = new Date();
    user.devices[existingDeviceIndex].appVersion = deviceInfo.version;
    user.devices[existingDeviceIndex].platform = deviceInfo.platform;
  } else {
    user.devices.push({
      deviceId: deviceInfo.id,
      platform: deviceInfo.platform,
      appVersion: deviceInfo.version,
      lastSeenAt: new Date()
    });
  }
  await user.save();
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update device info if present
    if (req.device) {
      await updateDeviceLogin(user, req.device);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('connections', 'profile.name profile.headline profile.avatar')
      .populate('savedJobs')
      .populate('appliedJobs.job');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

// Send connection request
exports.sendConnectionRequest = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUser = await User.findById(req.user.userId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if request already exists
    const existingRequest = targetUser.connectionRequests.find(
      request => request.from.toString() === req.user.userId
    );

    if (existingRequest) {
      return res.status(400).json({ message: 'Connection request already sent' });
    }

    // Add connection request
    targetUser.connectionRequests.push({
      from: req.user.userId,
      status: 'pending'
    });

    await targetUser.save();

    res.json({ message: 'Connection request sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending connection request', error: error.message });
  }
};

// Handle connection request
exports.handleConnectionRequest = async (req, res) => {
  try {
    const { requestId, action } = req.body;
    const user = await User.findById(req.user.userId);

    const request = user.connectionRequests.id(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Connection request not found' });
    }

    if (action === 'accept') {
      request.status = 'accepted';
      user.connections.push(request.from);
      
      // Add to other user's connections
      const otherUser = await User.findById(request.from);
      otherUser.connections.push(req.user.userId);
      await otherUser.save();
    } else if (action === 'reject') {
      request.status = 'rejected';
    }

    await user.save();

    res.json({ message: 'Connection request handled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error handling connection request', error: error.message });
  }
}; 