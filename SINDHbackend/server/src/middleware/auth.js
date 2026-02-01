const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    console.log('Auth middleware - Token received:', token ? 'Yes' : 'No');
    
    if (!token) {
      console.log('Auth middleware - No token provided');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    console.log('Auth middleware - Decoded token:', decoded);
    
    // Find the user in the appropriate model based on role
    let user = null;
    let userDoc = null;
    
    if (decoded.role === 'employer') {
      userDoc = await Employer.findById(decoded.userId);
      if (userDoc) {
        user = {
          userId: userDoc._id,
          role: 'employer',
          name: userDoc.name,
          email: userDoc.email,
          phone: userDoc.phone
        };
      }
    } else if (decoded.role === 'worker') {
      userDoc = await Worker.findById(decoded.userId);
      if (userDoc) {
        user = {
          userId: userDoc._id,
          role: 'worker',
          name: userDoc.name,
          phone: userDoc.phone
        };
      }
    } else {
      // Fallback to User model
      userDoc = await User.findById(decoded.userId);
      if (userDoc) {
        user = decoded;
      }
    }
    
    if (!user || !userDoc) {
      console.log('Auth middleware - User not found for ID:', decoded.userId, 'role:', decoded.role);
      return res.status(401).json({ message: 'Token is not valid - user not found' });
    }
    
    console.log('Auth middleware - User found:', user.userId, user.role);
    
    req.user = user;
    req.userDoc = userDoc;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;