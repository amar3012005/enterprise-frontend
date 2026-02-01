const { admin, db } = require('../config/firebase');
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const logger = require('../config/logger');
const {
  AppError,
  ValidationError,
  NotFoundError,
  asyncHandler
} = require('../middleware/errorHandler');

// Test endpoint to confirm backend connectivity for employers
router.post('/initiate-registration', async (req, res) => {
  console.log('🎉 Employer registration initiated!');
  logger.info('🎉 Employer registration initiated!');

  res.json({
    success: true,
    message: 'Employer registration initiated successfully!'
  });
});

// Register a new employer (Firestore-native)
router.post('/register', asyncHandler(async (req, res) => {
  console.log('🎯 POST /register endpoint hit');
  logger.info('Employer registration request received');

  const {
    name,
    phone,
    email,
    location,
    termsAccepted,
    age,
    company,
    businessDescription,
    workerType,
    verificationDocuments
  } = req.body;

  if (!name || !phone || !location) {
    throw new ValidationError('Name, phone, and location are required for registration');
  }

  if (!termsAccepted) {
    throw new ValidationError('You must accept the Terms of Service to register');
  }

  const firestoreEmployerSnapshot = await db.collection('employers').where('phone', '==', phone).limit(1).get();
  if (!firestoreEmployerSnapshot.empty) {
    logger.warn(`Employer already exists in Firestore: ${phone}`);
    throw new ValidationError('Employer already exists with this phone number. Please login instead.');
  }

  const formattedLocationAddress =
    `${location.village || ''}, ${location.district || ''}, ${location.state || ''} - ${location.pincode || ''}`.trim();

  let validatedCoordinates = null;
  if (location.coordinates) {
    const coords = location.coordinates.coordinates || location.coordinates;
    if (Array.isArray(coords) && coords.length === 2) {
      const [lng, lat] = coords;
      if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
        validatedCoordinates = { type: 'Point', coordinates: [lng, lat] };
      }
    }
  }

  const formattedCompany = {
    name: company?.name || company || '',
    type: company?.type || '',
    industry: company?.industry || [],
    primaryIndustry: company?.primaryIndustry || '',
    description: company?.description || '',
    registrationNumber: company?.registrationNumber || ''
  };

  const employerDataRaw = {
    name: name.trim(),
    email: email || '',
    phone: phone,
    age: age || 25,
    company: formattedCompany,
    location: {
      village: location.village || '',
      district: location.district || '',
      state: location.state || '',
      pincode: location.pincode || '',
      address: formattedLocationAddress,
      ...(validatedCoordinates && { coordinates: validatedCoordinates })
    },
    businessDescription: businessDescription || '',
    workerType: workerType || 'Daily wage workers',
    verificationDocuments: {
      aadharNumber: verificationDocuments?.aadharNumber || 'not provided',
      panNumber: verificationDocuments?.panNumber || '',
      businessLicense: verificationDocuments?.businessLicense || ''
    },
    phase: 1,
    termsAccepted: true,
    termsAcceptedAt: new Date(),
    type: 'employer',
    isLoggedIn: 1,
    lastLogin: new Date(),
    registrationLocation: req.body.registrationLocation || null // Capture exact coordinates and timestamp
  };

  const { firebaseUid } = req.body;
  const targetId = firebaseUid || db.collection('employers').doc().id;

  try {
    const firestoreRef = db.collection('employers').doc(targetId);

    const firestoreData = {
      ...employerDataRaw,
      _id: targetId,
      id: targetId,
      firebaseUid: firebaseUid || null,
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      registrationDate: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    };

    await firestoreRef.set(firestoreData);
    console.log('💾 Employer profile saved to Firestore root collection (employers):', targetId);

    await db.collection('users').doc(targetId).set({
      phone: employerDataRaw.phone,
      mongoId: targetId,
      type: 'employer',
      firebaseUid: firebaseUid || null
    });
  } catch (fsError) {
    console.error('❌ CRITICAL: Failed to save employer to Firestore:', fsError.message);
    throw new AppError('Profile creation failed. Please try again.', 500);
  }

  logger.info(`Employer registered successfully in Firestore: ${name}`);

  const responseData = {
    success: true,
    message: 'Employer registered successfully',
    employer: {
      ...employerDataRaw,
      id: targetId,
      _id: targetId,
      isLoggedIn: 1
    }
  };

  res.status(201).json(responseData);
}));

// Get employer by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const isEmployerUser = (req.headers['user-type'] || req.query.userType) === 'employer';
  const employerId = req.params.id;

  logger.info(`Fetching employer by ID from Firestore: ${employerId}`);

  const employerDoc = await db.collection('employers').doc(employerId).get();

  if (!employerDoc.exists) {
    throw new NotFoundError('Employer not found');
  }

  const employer = employerDoc.data();

  const jobsSnapshot = await db.collection('jobs').where('employer', '==', employerId).get();
  const jobs = jobsSnapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
    _id: doc.id
  }));

  if (!isEmployerUser) {
    const publicData = {
      _id: employerId,
      id: employerId,
      name: employer.name,
      company: {
        name: employer.company?.name,
        industry: employer.company?.industry
      },
      location: employer.location,
      rating: employer.rating,
      jobsCount: jobs.length
    };

    return res.json(publicData);
  }

  const enrichedEmployer = {
    ...employer,
    id: employerId,
    _id: employerId,
    postedJobs: jobs.map(job => job.id)
  };

  res.json(enrichedEmployer);
}));

// Get all jobs posted by an employer
router.get('/:id/jobs', asyncHandler(async (req, res) => {
  const employerId = req.params.id;
  logger.info(`Fetching jobs for employer from Firestore: ${employerId}`);

  const jobsSnapshot = await db.collection('jobs').where('employer', '==', employerId).get();
  const jobs = jobsSnapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
    _id: doc.id
  })).sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return dateB - dateA;
  });

  res.json(jobs);
}));

// Get employer statistics
router.get('/:id/stats', asyncHandler(async (req, res) => {
  const employerId = req.params.id;
  logger.info(`Fetching stats for employer from Firestore: ${employerId}`);

  const jobsSnapshot = await db.collection('jobs').where('employer', '==', employerId).get();
  const jobs = jobsSnapshot.docs.map(doc => doc.data());

  const stats = {
    totalJobs: jobs.length,
    activeJobs: jobs.filter(job => ['POSTED', 'APPLIED', 'active', 'in-progress'].includes(job.status)).length,
    completedJobs: jobs.filter(job => ['COMPLETED', 'completed', 'finished'].includes(job.status)).length,
    totalApplications: jobs.reduce((sum, job) => sum + (job.applicantCount || 0), 0),
    averageApplicationsPerJob: jobs.length ?
      jobs.reduce((sum, job) => sum + (job.applicantCount || 0), 0) / jobs.length : 0
  };
  res.json(stats);
}));

// Example: Get logged-in employer profile (requires auth middleware)
router.get('/profile', auth, asyncHandler(async (req, res) => {
  const employerId = req.user?.id || req.user?._id;
  logger.info(`Fetching logged-in employer profile from Firestore: ${employerId}`);

  const employerDoc = await db.collection('employers').doc(employerId).get();
  if (!employerDoc.exists) {
    throw new NotFoundError('Employer not found');
  }
  res.json({
    ...employerDoc.data(),
    id: employerDoc.id,
    _id: employerDoc.id
  });
}));

const checkEmployerAccess = (req, res, next) => {
  const userType = req.headers['user-type'] || req.query.userType;
  const userId = req.headers['user-id'] || req.query.userId;
  const targetEmployerId = req.params.id;

  if (userType !== 'employer' && req.method !== 'GET') {
    logger.warn(`Unauthorized access attempt by non-employer to modify employer data`);
    return res.status(403).json({
      success: false,
      message: 'Unauthorized: Only employers can access this endpoint'
    });
  }

  if (userType === 'employer' && userId !== targetEmployerId && req.method !== 'GET') {
    logger.warn(`Unauthorized access attempt by employer ${userId} to access another employer's data`);
    return res.status(403).json({
      success: false,
      message: 'Unauthorized: You can only access your own profile'
    });
  }

  next();
};

router.put('/:id', checkEmployerAccess, asyncHandler(async (req, res) => {
  const employerId = req.params.id;
  logger.info(`Update employer request for ID: ${employerId}`);

  const employerRef = db.collection('employers').doc(employerId);
  const employerDoc = await employerRef.get();

  if (!employerDoc.exists) {
    throw new NotFoundError('Employer not found');
  }

  const updateData = {
    ...req.body,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await employerRef.update(updateData);

  const updatedDoc = await employerRef.get();
  logger.info(`Employer updated successfully in Firestore: ${employerId}`);
  res.json({
    ...updatedDoc.data(),
    id: updatedDoc.id,
    _id: updatedDoc.id
  });
}));

module.exports = router;




