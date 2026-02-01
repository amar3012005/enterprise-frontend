
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { admin, db } = require('../config/firebase');
const logger = require('../config/logger');
const jwt = require('jsonwebtoken');
const {
  ValidationError,
  NotFoundError,
  asyncHandler
} = require('../middleware/errorHandler');

// Initialize Firebase Admin SDK
// Admin is initialized in ../config/firebase.js

const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'fallback-secret-key',
    { expiresIn: '7d' }
  );
};

router.post('/firebase-login', asyncHandler(async (req, res) => {
  const { token, userType } = req.body;

  if (!token || !userType) {
    throw new ValidationError('Firebase ID token and user type are required.');
  }

  const normalizedUserType = userType === 'employer' ? 'employer' : 'worker';

  logger.info(`🔐 Firebase login attempt for userType: ${normalizedUserType}`);

  // Verify the ID token with Firebase Admin SDK
  const decodedToken = await admin.auth().verifyIdToken(token);
  const fullPhoneNumber = decodedToken.phone_number; // Full number with country code (e.g., +49176...)
  const firebaseUid = decodedToken.uid; // NEW: Extract Firebase UID

  // Extract phone without country code for backward compatibility
  // Store both the full number (with country code) and just the local number
  let phoneWithoutCode = fullPhoneNumber;
  const countryCodeMatch = fullPhoneNumber.match(/^\+(\d{1,4})/);
  if (countryCodeMatch) {
    // countryCodeMatch[0] contains the full match including '+' (e.g., '+49')
    phoneWithoutCode = fullPhoneNumber.substring(countryCodeMatch[0].length);
  }

  logger.info(`📱 Verified phone number: ${fullPhoneNumber} (UID: ${firebaseUid})`);

  // PRIMARY CHECK: Look for user by Firebase UID in the requested root collection
  const rootCollection = normalizedUserType === 'worker' ? 'workers' : 'employers';
  let userDoc = await db.collection(rootCollection).doc(firebaseUid).get();

  let mongoId;
  let userTypeFromFirestore = normalizedUserType;

  if (userDoc.exists) {
    logger.info(`✅ User found by UID in root collection (${rootCollection}): ${firebaseUid}`);
    const userData = userDoc.data();
    mongoId = userData.mongoId || firebaseUid; // Use mongoId if present, otherwise assume UID is the ID
  } else {
    // FALLBACK: Check legacy 'users' collection by phone AND type to avoid cross-role collisions
    let snapshot = await db.collection('users')
      .where('phone', '==', fullPhoneNumber)
      .where('type', '==', normalizedUserType)
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Try without country code for backward compatibility with old Indian numbers
      snapshot = await db.collection('users')
        .where('phone', '==', phoneWithoutCode)
        .where('type', '==', normalizedUserType)
        .limit(1)
        .get();
    }

    if (snapshot.empty) {
      logger.info(`🆕 New ${normalizedUserType} detected - UID ${firebaseUid} not found in Firestore`);
      return res.status(200).json({
        success: true,
        requiresRegistration: true,
        message: 'Please complete your registration.',
        phoneNumber: fullPhoneNumber, // Send full phone number with country code
        firebaseUid, // NEW: Send UID to frontend
        userType: normalizedUserType
      });
    }

    // User exists in legacy mapping of the requested type
    const firestoreDoc = snapshot.docs[0];
    const firestoreData = firestoreDoc.data();
    mongoId = firestoreData.mongoId;
    userTypeFromFirestore = firestoreData.type || normalizedUserType;

    logger.info(`✅ User found in legacy Firestore mapping - mongoId: ${mongoId}, type: ${userTypeFromFirestore}`);
  }

  // Fetch full profile from Firestore (Primary Source of Truth)
  let userProfileData;
  // Try finding by Firebase UID first (new registrations)
  let profileDoc = await db.collection(rootCollection).doc(firebaseUid).get();

  if (!profileDoc.exists && mongoId && mongoId !== firebaseUid) {
    // Fallback: Try finding by legacy Mongo ID (migrated users)
    profileDoc = await db.collection(rootCollection).doc(mongoId).get();
  }

  if (!profileDoc.exists) {
    logger.warn(`⚠️ Profile not found in Firestore root collection ${rootCollection} for UID: ${firebaseUid} or MongoId: ${mongoId}`);
    return res.status(200).json({
      success: true,
      requiresRegistration: true,
      message: 'Please complete your registration.',
        phoneNumber: fullPhoneNumber,
        firebaseUid,
        userType: normalizedUserType
    });
  }

  userProfileData = profileDoc.data();
  const targetId = profileDoc.id; // Use the document ID for all references

  // Update last login in Firestore (Background)
  db.collection(rootCollection).doc(targetId).update({
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    isLoggedIn: 1
  }).catch(err => logger.warn(`⚠️ Non-critical: Failed to update Firestore timestamps: ${err.message}`));

  // Format profile for response
  const userProfile = {
    ...userProfileData,
    id: targetId,
    _id: targetId,
    phoneNumber: userProfileData.phone || fullPhoneNumber,
    type: userTypeFromFirestore,
    phase: userProfileData.phase || 1
  };

  // Generate JWT token with the Firestore ID (Primary Identifier)
  const sessionToken = generateToken(targetId, userTypeFromFirestore);

  // Generate Firebase Custom Token for client-side Firestore SDK authentication
  // This bridges the gap between Native Auth (Capacitor) and Web SDK (Firestore)
  let firebaseCustomToken;
  try {
    firebaseCustomToken = await admin.auth().createCustomToken(targetId, {
      type: userTypeFromFirestore
    });
  } catch (error) {
    logger.error(`Error generating custom token for ${targetId}: ${error.message}`);
    // Don't fail the whole login, but client-side Firestore might have issues
  }

  logger.info(`✅ Firestore login successful for ${userProfile.name} (${userTypeFromFirestore})`);

  res.json({
    success: true,
    message: 'Login successful',
    token: sessionToken,
    firebaseCustomToken, // Send this to the client
    requiresRegistration: false,
    data: userProfile
  });

}));


// Worker login
router.post('/workers/login', asyncHandler(async (req, res) => {
  logger.info('Worker login attempt');

  const { phoneNumber } = req.body;

  if (!phoneNumber || phoneNumber.length !== 10) {
    logger.warn('Invalid phone number provided for worker login');
    throw new ValidationError('Please provide a valid 10-digit phone number');
  }

  // Find worker by phone number
  const worker = await Worker.findOne({ phone: phoneNumber });

  if (!worker) {
    logger.info(`Worker not found with phone number: ${phoneNumber}, redirecting to registration`);
    return res.status(200).json({
      success: true,
      newUser: true,
      message: 'Please complete your registration',
      phoneNumber
    });
  }

  // Fetch job applications with proper population
  const jobApplications = await JobApplication.find({ worker: worker._id })
    .populate({
      path: 'job',
      select: 'title location salary status description'
    })
    .populate({
      path: 'employer',
      select: 'name company'
    })
    .sort({ updatedAt: -1 });

  // Separate current and past jobs
  const currentJobs = jobApplications.filter(app =>
    app.status === 'pending' || app.status === 'accepted'
  );
  const pastJobs = jobApplications.filter(app =>
    app.status === 'completed' || app.status === 'rejected'
  );

  // Generate JWT token
  const token = generateToken(worker._id, 'worker');

  // Return worker data with job history and token
  const workerData = {
    id: worker._id,
    name: worker.name,
    phoneNumber: worker.phone,
    location: worker.location,
    skills: worker.skills,
    language: worker.language,
    experience_years: worker.experience_years,
    available: worker.available,
    rating: worker.rating,
    jobHistory: {
      current: currentJobs,
      past: pastJobs
    }
  };

  logger.info(`Worker login successful for ${worker.name}`);
  res.json({
    success: true,
    message: 'Login successful',
    token,
    data: workerData
  });
}));

// Employer login
router.post('/employers/login', asyncHandler(async (req, res) => {
  logger.info('Employer login attempt');

  const { phoneNumber } = req.body;

  if (!phoneNumber || phoneNumber.length !== 10) {
    logger.warn('Invalid phone number provided for employer login');
    throw new ValidationError('Please provide a valid 10-digit phone number');
  }

  // Find employer by phone number
  const employer = await Employer.findOne({ phone: phoneNumber });

  if (!employer) {
    logger.info(`Employer not found with phone number: ${phoneNumber}, redirecting to registration`);
    return res.status(200).json({
      success: true,
      newUser: true,
      message: 'Please complete your registration',
      phoneNumber
    });
  }

  // Update employer login status
  employer.isLoggedIn = 1;
  employer.lastLogin = new Date();

  // Check if employer has all required fields before saving
  if (!employer.age) {
    logger.warn(`Employer ${employer.phone} missing required age field, redirecting to complete registration`);
    return res.status(200).json({
      success: true,
      incompleteProfile: true,
      message: 'Please complete your profile by adding missing information',
      phoneNumber: employer.phone,
      missingFields: ['age']
    });
  }

  await employer.save();

  // Generate JWT token
  const token = generateToken(employer._id, 'employer');

  // Format the employer data correctly
  const employerData = {
    id: employer._id.toString(),
    _id: employer._id.toString(),
    name: employer.name,
    phoneNumber: employer.phone,
    phone: employer.phone,
    email: employer.email,
    company: employer.company,
    location: employer.location,
    businessDescription: employer.businessDescription,
    verificationDocuments: employer.verificationDocuments,
    preferredLanguages: employer.preferredLanguages,
    rating: employer.rating,
    type: 'employer',
    isLoggedIn: 1,
    lastLogin: employer.lastLogin
  };

  logger.info(`Employer login successful for ${employer.name}`);
  res.json({
    success: true,
    message: 'Login successful',
    token,
    data: employerData
  });
}));

// Generate token endpoint for newly registered employers
router.post('/generate-token', asyncHandler(async (req, res) => {
  const { userId, role } = req.body;

  if (!userId || !role) {
    throw new ValidationError('User ID and role are required');
  }

  // Generate JWT token
  const token = generateToken(userId, role);

  res.json({
    success: true,
    token
  });
}));

// Worker OTP request
router.post('/worker/request-otp', asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    throw new ValidationError('Please provide a phone number');
  }

  logger.info(`Worker OTP request for phone: ${phone}`);

  // Check if worker exists in Firestore
  const snapshot = await db.collection('workers').where('phone', '==', phone).limit(1).get();

  if (snapshot.empty) {
    logger.info(`New worker phone number: ${phone}, will create during registration`);
  } else {
    const worker = snapshot.docs[0].data();
    logger.info(`Existing worker found in Firestore: ${worker.name} (Phase: ${worker.phase})`);
  }

  const otp = '0000'; // Fixed OTP for development

  logger.info(`OTP request processed for worker phone: ${phone}`);
  res.json({
    success: true,
    message: 'OTP sent successfully',
    otp: otp
  });
}));

// Worker OTP verification
router.post('/worker/verify-otp', asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    throw new ValidationError('Phone number and OTP are required');
  }

  if (otp !== '0000') {
    throw new ValidationError('Invalid OTP');
  }

  const snapshot = await db.collection('workers').where('phone', '==', phone).limit(1).get();
  const isNewUser = snapshot.empty;

  let requiresRegistration = false;
  let worker = null;
  let workerId = null;

  if (!isNewUser) {
    const workerDoc = snapshot.docs[0];
    worker = workerDoc.data();
    workerId = workerDoc.id;
    requiresRegistration = !worker.name ||
      worker.name === 'Temporary' ||
      !worker.preferredCategory ||
      !worker.expectedSalary ||
      !worker.location?.pincode;
  }

  logger.info(`Worker OTP verification (Firestore): phone=${phone}, isNewUser=${isNewUser}, requiresRegistration=${requiresRegistration}`);

  if (isNewUser) {
    return res.json({
      success: true,
      message: 'Please complete your registration',
      isNewUser: true,
      requiresRegistration: true,
      phoneNumber: phone
    });
  }

  if (requiresRegistration) {
    return res.json({
      success: true,
      message: 'Please complete your registration',
      isNewUser: false,
      requiresRegistration: true,
      phoneNumber: phone
    });
  }

  // Update login status in Firestore
  await db.collection('workers').doc(workerId).update({
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    isLoggedIn: 1
  }).catch(err => logger.warn(`⚠️ Failed to update worker login in Firestore: ${err.message}`));

  const token = generateToken(workerId, 'worker');

  logger.info(`Worker login successful from Firestore: ${worker.name}`);
  res.json({
    success: true,
    message: 'Login successful',
    token,
    isNewUser: false,
    requiresRegistration: false,
    data: {
      worker: {
        ...worker,
        id: workerId,
        _id: workerId,
        type: 'worker',
        phase: worker.phase || 1
      }
    }
  });
}));

// Employer OTP request
router.post('/employer/request-otp', asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    throw new ValidationError('Please provide a phone number');
  }

  logger.info(`Employer OTP request for phone from Firestore: ${phone}`);

  // Check if employer exists in Firestore
  const snapshot = await db.collection('employers').where('phone', '==', phone).limit(1).get();

  if (snapshot.empty) {
    logger.info(`Creating temporary employer in Firestore for phone: ${phone}`);
    const targetId = (new mongoose.Types.ObjectId()).toString();
    const temporaryEmployer = {
      phone,
      name: 'Temporary',
      email: '',
      location: {
        village: '',
        district: '',
        state: '',
        pincode: ''
      },
      phase: 1,
      termsAccepted: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('employers').doc(targetId).set(temporaryEmployer);
    await db.collection('users').doc(targetId).set({
      phone,
      mongoId: targetId,
      type: 'employer'
    });
  } else {
    logger.info(`Found existing employer in Firestore: ${snapshot.docs[0].data().name}`);
  }

  const otp = '0000'; // Fixed OTP for development

  logger.info(`OTP request processed for employer phone: ${phone}`);
  res.json({
    success: true,
    message: 'OTP sent successfully',
    otp: otp
  });
}));

// Employer OTP verification
router.post('/employer/verify-otp', asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    throw new ValidationError('Phone number and OTP are required');
  }

  if (otp !== '0000') {
    throw new ValidationError('Invalid OTP');
  }

  const snapshot = await db.collection('employers').where('phone', '==', phone).limit(1).get();

  if (snapshot.empty) {
    throw new NotFoundError('Employer not found');
  }

  const employerDoc = snapshot.docs[0];
  const employer = employerDoc.data();
  const employerId = employerDoc.id;

  // Update login status
  await db.collection('employers').doc(employerId).update({
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    isLoggedIn: 1
  }).catch(err => logger.warn(`⚠️ Failed to update employer login in Firestore: ${err.message}`));

  const isNewUser = employer.name === 'Temporary';
  const requiresRegistration =
    employer.name === 'Temporary' ||
    !employer.location?.state ||
    !employer.location?.village;

  const token = generateToken(employerId, 'employer');

  logger.info(`Employer OTP verified successfully in Firestore: ${employer.name}`);
  res.json({
    success: true,
    message: 'OTP verified successfully',
    token,
    isNewUser,
    requiresRegistration,
    phase: employer.phase || 1,
    data: {
      employer: {
        ...employer,
        id: employerId,
        _id: employerId,
        type: 'employer'
      }
    }
  });
}));

module.exports = router;