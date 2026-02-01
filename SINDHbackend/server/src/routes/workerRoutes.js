const { admin, db } = require('../config/firebase');
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  asyncHandler
} = require('../middleware/errorHandler');

// Test endpoint to confirm backend connectivity
router.post('/initiate-registration', async (req, res) => {
  console.log('🎉 Worker registration initiated!');
  logger.info('🎉 Worker registration initiated!');

  res.json({
    success: true,
    message: 'Worker registration initiated successfully!'
  });
});

// Register a new worker
router.post('/register', asyncHandler(async (req, res) => {
  console.log('🎯 /register endpoint hit');
  logger.info('Worker registration request');

  console.log('📝 Request body received:', JSON.stringify(req.body, null, 2));
  const {
    name,
    age,
    phone,
    email,
    gender,
    aadharNumber,
    skills,
    experience,
    preferredCategory,
    expectedSalary,
    languages,
    location,
    preferredWorkType,
    availability,
    workRadius,
    bio,
    phase = 1 // Default to Phase-1
  } = req.body;

  console.log('🔍 Checking for existing worker with phone in Firestore:', phone);

  // PRIMARY CHECK: Check if a profile ALREADY exists in the root 'workers' collection
  // We check 'workers' instead of 'users' mapping because a user might exist in mapping 
  // but be missing their root profile (migrated but incomplete registration).
  const firestoreWorkerSnapshot = await db.collection('workers').where('phone', '==', phone).limit(1).get();

  if (!firestoreWorkerSnapshot.empty) {
    console.log('❌ Worker profile already exists in Firestore root collection:', phone);
    logger.warn(`Worker already exists in Firestore: ${phone}`);
    throw new ValidationError('Worker already exists with this phone number. Please login instead.');
  }

  console.log('✅ No existing worker profile found, proceeding with registration');

  // Enhanced Phase-1 validation
  if (phase === 1) {
    // Phase-1 requires: name, age, phone, preferredCategory, expectedSalary, location
    if (!name || !name.trim()) {
      throw new ValidationError('Name is required for Phase-1 registration');
    }
    if (!age || age < 18 || age > 70) {
      throw new ValidationError('Valid age (18-70) is required for Phase-1 registration');
    }
    // Validate phone number (flexible for international numbers)
    if (!phone) {
      throw new ValidationError('Phone number is required');
    }
    // Check if it has country code format (+XX...)
    if (phone.startsWith('+')) {
      // International format: require at least 10 characters total
      if (phone.length < 10) {
        throw new ValidationError('Valid phone number is required');
      }
    } else {
      // Legacy format without country code: require exactly 10 digits
      if (phone.length !== 10) {
        throw new ValidationError('Valid 10-digit phone number is required');
      }
    }
    if (!preferredCategory) {
      throw new ValidationError('Preferred work category is required for Phase-1 registration');
    }
    if (!expectedSalary) {
      throw new ValidationError('Expected salary is required for Phase-1 registration');
    }
    if (!location) {
      throw new ValidationError('Location information is required for Phase-1 registration');
    }
  }

  // Validate location - must have either pincode or coordinates
  if (!location?.pincode && (!location?.coordinates || !Array.isArray(location.coordinates))) {
    throw new ValidationError('Location must include either pincode or GPS coordinates');
  }

  // Format location data - handle nested coordinates from frontend
  const formattedLocation = {
    address: location?.address || '',
    village: location?.village || '',
    district: location?.district || '',
    state: location?.state || '',
    pincode: location?.pincode || '',
    coordinates: {
      type: "Point",
      coordinates: (
        Array.isArray(location?.coordinates?.coordinates)
          ? location.coordinates.coordinates
          : Array.isArray(location?.coordinates)
            ? location.coordinates
            : [0, 0]
      )
    }
  };

  console.log('🔧 Creating worker object data');
  const workerDataRaw = {
    name: name.trim(),
    age: parseInt(age) || 25,
    phone,
    email: email || '',
    gender: gender || 'Male',
    aadharNumber: aadharNumber || null,
    skills: skills || [],
    experience: experience || 'Less than 1 year',
    preferredCategory: preferredCategory || 'Construction',
    expectedSalary: expectedSalary || '₹500 per day',
    languages: languages || ['Hindi'],
    location: formattedLocation,
    preferredWorkType: preferredWorkType || 'Full-time daily work',
    availability: availability || 'Available immediately',
    workRadius: parseInt(workRadius) || 10,
    bio: bio || '',
    phase: parseInt(phase) || 1,
    verificationStatus: 'pending',
    isAvailable: true,
    rating: { average: 0, count: 0, reviews: [] },
    registrationLocation: req.body.registrationLocation || null, // Capture exact coordinates and timestamp
    registrationDate: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    isLoggedIn: 1,
    documents: [],
    workHistory: [],
    activeJobs: 0,
    completedJobs: 0,
    emailNotifications: true,
    smsNotifications: true,
    profilePicture: '',
    bankDetails: {
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      accountHolderName: ''
    },
    emergencyContact: {
      name: '',
      phone: '',
      relation: ''
    },
    type: 'worker'
  };

  // Extract firebaseUid if provided by frontend
  const { firebaseUid } = req.body;

  // STEP 2: SAVE TO FIRESTORE (Primary)
  // Use Firebase UID as document ID in 'workers' collection (Phase 1 Strategy)
  // Fallback to mongoId if firebaseUid is not provided (should not happen with new logic)
  const targetId = firebaseUid || db.collection('workers').doc().id;

  try {
    const firestoreRef = db.collection('workers').doc(targetId);

    const firestoreData = {
      ...workerDataRaw,
      _id: targetId,
      id: targetId,
      firebaseUid: firebaseUid || null,
      type: 'worker',
      role: 'worker',
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      registrationDate: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    };

    await firestoreRef.set(firestoreData);
    console.log('💾 Worker profile saved to Firestore root collection (workers):', targetId);

    // Also update legacy tracking in 'users' collection for backward compatibility
    await db.collection('users').doc(targetId).set({
      phone: workerDataRaw.phone,
      mongoId: targetId,
      type: 'worker',
      firebaseUid: firebaseUid || null
    });
  } catch (fsError) {
    console.error('❌ CRITICAL: Failed to save to Firestore:', fsError.message);
    throw new AppError('Profile creation failed. Please try again.', 500);
  }

  logger.info(`Worker registered successfully in Firestore: ${name}`);

  const responseData = {
    success: true,
    message: 'Worker registered successfully',
    worker: {
      ...workerDataRaw,
      id: targetId,
      _id: targetId,
      type: 'worker',
      isLoggedIn: 1
    }
  };

  res.status(201).json(responseData);
}));

// Get all workers
router.get('/', asyncHandler(async (req, res) => {
  logger.info('Fetching all workers from Firestore');
  const snapshot = await db.collection('workers').get();
  const workers = snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
    _id: doc.id
  }));
  res.json(workers);
}));

// Get worker by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Fetching worker by ID from Firestore: ${id}`);

  // PRIMARY: Fetch from Firestore 'workers' collection
  const workerDoc = await db.collection('workers').doc(id).get();

  if (!workerDoc.exists) {
    console.error(`❌ [GET /api/workers/${id}] Worker NOT FOUND in Firestore`);
    throw new NotFoundError('Worker not found');
  }

  const workerData = workerDoc.data();
  console.log(`✅ [GET /api/workers/${id}] Worker found in Firestore: ${workerData.name}`);

  // Return formatted worker object (normalize ID)
  res.json({
    ...workerData,
    id: workerDoc.id,
    _id: workerDoc.id
  });
}));

// Update worker
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`ROBUSTNESS_CHECK: H3 - Worker profile update attempt for ${id}`, { updates: Object.keys(req.body) });
  logger.info(`Updating worker in Firestore: ${id}`);

  await db.collection('workers').doc(id).update({
    ...req.body,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  const updatedDoc = await db.collection('workers').doc(id).get();
  const updatedWorker = updatedDoc.data();

  logger.info(`Worker profile updated in Firestore: ${updatedWorker.name}`);
  res.json({
    ...updatedWorker,
    id: updatedDoc.id,
    _id: updatedDoc.id
  });
}));

// Delete worker
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Deleting worker from Firestore: ${id}`);

  await db.collection('workers').doc(id).delete();
  await db.collection('users').doc(id).delete().catch(() => { });

  logger.info(`Worker deleted from Firestore: ${id}`);
  res.json({ message: 'Worker deleted successfully' });
}));

// Get worker profile with job history
router.get('/:id/profile', asyncHandler(async (req, res) => {
  const workerId = req.params.id;
  logger.info(`Fetching worker profile from Firestore: ${workerId}`);

  const workerDoc = await db.collection('workers').doc(workerId).get();
  if (!workerDoc.exists) {
    throw new NotFoundError('Worker not found');
  }
  const worker = workerDoc.data();

  // Fetch reviews from sub-collection
  const reviewsSnapshot = await db.collection('workers').doc(workerId)
    .collection('reviews')
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  const reviews = reviewsSnapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id
  }));

  const applicationsSnapshot = await db.collection('applications')
    .where('worker', '==', workerId)
    .get();

  const jobApplications = applicationsSnapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
    _id: doc.id
  })).sort((a, b) => {
    const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt || 0);
    const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt || 0);
    return dateB - dateA;
  });

  const currentJobs = jobApplications.filter(app =>
    ['pending', 'accepted', 'applied', 'working', 'in-progress'].includes(app.status)
  );
  const pastJobs = jobApplications.filter(app =>
    ['completed', 'paid', 'finished'].includes(app.status)
  );

  res.json({
    worker: {
      ...worker,
      id: workerId,
      _id: workerId,
      reviews: reviews,
      jobHistory: {
        current: currentJobs,
        past: pastJobs
      }
    }
  });
}));

// Worker login
router.post('/login', asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    throw new ValidationError('Phone number is required');
  }

  logger.info(`Worker login attempt for phone: ${phone}`);

  // PRIMARY: Check Firestore
  const snapshot = await db.collection('workers').where('phone', '==', phone).limit(1).get();

  if (snapshot.empty) {
    throw new NotFoundError('Worker not found. Please register first.');
  }

  const workerDoc = snapshot.docs[0];
  const worker = workerDoc.data();
  const workerId = workerDoc.id;

  // Update Firestore (Background)
  db.collection('workers').doc(workerId).update({
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    isLoggedIn: 1
  }).catch(err => logger.warn(`⚠️ Failed to update login status in Firestore: ${err.message}`));

  logger.info(`Worker login successful: ${worker.name}`);
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      worker: {
        ...worker,
        id: workerId,
        _id: workerId,
        type: 'worker'
      }
    }
  });
}));

// Get worker balance and earnings
router.get('/:id/balance', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const workerDoc = await db.collection('workers').doc(id).get();

  if (!workerDoc.exists) {
    throw new NotFoundError('Worker not found');
  }

  const worker = workerDoc.data();

  // Use new wallet structure if available, fallback to old or 0
  const totalBalance = worker.wallet?.totalBalance || worker.balance || 0;
  const withdrawableBalance = worker.wallet?.withdrawableBalance || 0;

  // Map earnings from transaction history if available
  let earnings = worker.earnings || [];
  if (worker.wallet?.transactionHistory) {
    earnings = worker.wallet.transactionHistory
      .filter(t => t.type === 'credit' || t.type === 'earning' || t.type === 'credit_pending')
      .map(t => ({
        jobId: t.jobId,
        amount: t.amount,
        description: t.description,
        date: t.createdAt,
        status: t.type === 'credit_pending' ? 'pending' : 'completed'
      }));
  }

  res.json({
    balance: totalBalance, // This is what shows on Homepage
    withdrawableBalance: withdrawableBalance, // For withdrawal UI
    earnings: earnings
  });
}));

// Manually process payment for completed job
// Note: This still updates MongoDB as a shadow write for now, but uses Firestore data
router.post('/:workerId/process-payment/:applicationId', asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const { workerId, applicationId } = req.params;

  logger.info(`ROBUSTNESS_CHECK: H1 - Entering process-payment for worker ${workerId}`, { applicationId, amount });

  const workerDoc = await db.collection('workers').doc(workerId).get();
  if (!workerDoc.exists) {
    throw new NotFoundError('Worker not found');
  }

  const applicationDoc = await db.collection('applications').doc(applicationId).get();
  if (!applicationDoc.exists) {
    throw new NotFoundError('Job application not found');
  }

  const worker = workerDoc.data();
  const application = applicationDoc.data();

  const newBalance = (worker.balance || 0) + amount;
  const newEarning = {
    jobId: application.job,
    amount: amount,
    description: `Payment for: ${application.jobTitle || 'Job'}`,
    date: new Date()
  };

  // Update Firestore
  const transaction = {
    type: 'credit',
    amount: amount,
    description: `Payment for: ${application.jobTitle || 'Job'}`,
    jobId: application.job,
    applicationId: applicationId,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('workers').doc(workerId).update({
    balance: newBalance,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await db.collection('workers').doc(workerId).collection('transactions').add(transaction);

  await db.collection('applications').doc(applicationId).update({
    paymentStatus: 'paid',
    paymentAmount: amount,
    paymentDate: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  logger.info(`Payment processed for worker: ${worker.name}`);
  res.json({
    success: true,
    message: 'Payment processed successfully',
    newBalance: newBalance
  });
}));

// Recalculate and sync worker balance based on completed jobs
router.post('/:id/sync-balance', asyncHandler(async (req, res) => {
  const workerId = req.params.id;

  const workerDoc = await db.collection('workers').doc(workerId).get();
  if (!workerDoc.exists) {
    throw new NotFoundError('Worker not found');
  }

  const applicationsSnapshot = await db.collection('applications')
    .where('worker', '==', workerId)
    .where('status', '==', 'completed')
    .where('paymentStatus', '==', 'paid')
    .get();

  const completedApplications = applicationsSnapshot.docs.map(doc => doc.data());

  const totalEarned = completedApplications.reduce((sum, app) => {
    return sum + (app.paymentAmount || 0);
  }, 0);

  const earnings = completedApplications.map(app => ({
    jobId: app.job,
    amount: app.paymentAmount || 0,
    description: `Payment for job`,
    date: app.paymentDate || app.updatedAt || new Date()
  }));

  await db.collection('workers').doc(workerId).update({
    balance: totalEarned,
    earnings: earnings
  });

  res.json({
    success: true,
    message: 'Balance synchronized successfully',
    worker: {
      balance: totalEarned,
      earningsCount: earnings.length,
      totalEarned: totalEarned
    }
  });
}));

// Get worker wallet data (New Implementation using sub-collections)
router.get('/:id/wallet', asyncHandler(async (req, res) => {
  const workerId = req.params.id;
  logger.info(`Fetching worker wallet from Firestore: ${workerId}`);

  const workerDoc = await db.collection('workers').doc(workerId).get();
  if (!workerDoc.exists) {
    throw new NotFoundError('Worker not found');
  }

  let worker = workerDoc.data();

  // Initialize wallet if missing
  if (!worker.wallet) {
    worker.wallet = {
      pendingBalance: 0,
      totalEarnings: 0,
      withdrawnAmount: 0,
      totalBalance: 0,
      withdrawableBalance: 0
    };
    await db.collection('workers').doc(workerId).update({ wallet: worker.wallet });
  }

  const totalBalance = worker.wallet.totalBalance || worker.balance || 0;
  const withdrawableBalance = worker.wallet.withdrawableBalance || 0;
  const totalEarned = worker.wallet.totalEarnings || 0;
  const totalSpent = worker.wallet.withdrawnAmount || 0;

  // Fetch transactions from sub-collection
  const transactionsSnapshot = await db.collection('workers').doc(workerId)
    .collection('transactions')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const transactions = transactionsSnapshot.docs.map(doc => {
    const t = doc.data();
    return {
      id: doc.id,
      type: t.type === 'credit' ? 'earning' : t.type,
      amount: t.amount,
      description: t.description,
      date: t.createdAt?.toDate ? t.createdAt.toDate() : (t.createdAt || new Date()),
      status: t.type === 'credit_pending' ? 'pending' : 'completed',
      jobId: t.jobId,
      applicationId: t.applicationId
    };
  });

  res.json({
    balance: totalBalance,
    withdrawableBalance: withdrawableBalance,
    totalEarned: totalEarned,
    totalSpent: totalSpent,
    transactions: transactions
  });
}));

// Process withdrawal request
router.post('/:id/withdraw', asyncHandler(async (req, res) => {
  const workerId = req.params.id;
  const { amount, method } = req.body;

  const workerDoc = await db.collection('workers').doc(workerId).get();
  if (!workerDoc.exists) {
    throw new NotFoundError('Worker not found');
  }
  const worker = workerDoc.data();

  const safeWithdrawable = worker.wallet?.withdrawableBalance || 0;

  if (amount > safeWithdrawable) {
    throw new ValidationError(`Insufficient withdrawable balance. Available: ₹${safeWithdrawable}`);
  }

  const withdrawal = {
    amount: amount,
    method: method || 'bank_transfer',
    date: new Date(),
    status: 'pending'
  };

  const transaction = {
    type: 'withdrawal',
    amount: amount,
    description: `Withdrawal via ${method || 'bank_transfer'}`,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'pending'
  };

  const newWallet = {
    ...worker.wallet,
    withdrawableBalance: (worker.wallet.withdrawableBalance || 0) - amount,
    totalBalance: (worker.wallet.totalBalance || 0) - amount,
    withdrawnAmount: (worker.wallet.withdrawnAmount || 0) + amount,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('workers').doc(workerId).update({
    wallet: newWallet,
    balance: (worker.balance || 0) - amount,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await db.collection('workers').doc(workerId).collection('transactions').add(transaction);

  res.json({
    success: true,
    message: 'Withdrawal request submitted successfully',
    newBalance: newWallet.totalBalance,
    withdrawableBalance: newWallet.withdrawableBalance
  });
}));

module.exports = router;