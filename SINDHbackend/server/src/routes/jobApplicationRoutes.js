const express = require('express');
const router = express.Router();
const { admin, db } = require('../config/firebase');
const logger = require('../config/logger');
const { sendPushNotification } = require('../services/fcmService');
const {
  asyncHandler,
  ValidationError,
  NotFoundError
} = require('../middleware/errorHandler');

const mapApplication = (doc) => ({ ...doc.data(), id: doc.id, _id: doc.id });
const chunkArray = (arr, size = 10) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

// Apply for a job (Firestore)
router.post('/apply', asyncHandler(async (req, res) => {
  logger.info('🎯 Job application request received for Firestore');
  const { jobId, workerId, workerDetails, applicationLocation } = req.body;

  if (!jobId || !workerId) {
    throw new ValidationError('Job ID and Worker ID are required');
  }

  const jobDoc = await db.collection('jobs').doc(jobId).get();
  if (!jobDoc.exists) {
    throw new NotFoundError('Job not found');
  }
  const job = jobDoc.data();

  const existingAppSnapshot = await db.collection('applications')
    .where('job', '==', jobId)
    .where('worker', '==', workerId)
    .limit(1)
    .get();

  if (!existingAppSnapshot.empty) {
    throw new ValidationError('You have already applied for this job');
  }

  const workerDoc = await db.collection('workers').doc(workerId).get();
  if (!workerDoc.exists) {
    throw new NotFoundError('Worker not found');
  }
  const worker = workerDoc.data();

  const targetId = db.collection('applications').doc().id;
  const applicationData = {
    job: jobId,
    worker: workerId,
    employer: job.employer,
    status: 'applied',
    workerDetails: workerDetails || {},
    workerSnippet: {
      name: worker.name,
      rating: worker.rating?.average || 0,
      phone: worker.phone,
      profilePicture: worker.profilePicture || '',
      preferredCategory: worker.preferredCategory || ''
    },
    jobSnippet: {
      title: job.title,
      salary: job.salary || job.baseAmount || 0,
      location: job.location,
      companyName: job.companyName || ''
    },
    applicationLocation: applicationLocation || null, // Store exact coordinates and timestamp
    appliedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('applications').doc(targetId).set(applicationData);
  await db.collection('applications').doc(targetId).collection('statusHistory').add({
    status: 'applied',
    changedAt: admin.firestore.FieldValue.serverTimestamp(),
    note: 'Application submitted via Firestore'
  });

  db.collection('jobs').doc(jobId).update({
    applicantCount: admin.firestore.FieldValue.increment(1),
    status: 'APPLIED'
  }).catch(err => logger.warn(`⚠️ Failed to update job applicant count in Firestore: ${err.message}`));

  // --- Push Notification Trigger ---
  try {
    const employerDoc = await db.collection('employers').doc(job.employer).get();
    if (employerDoc.exists) {
      const employerData = employerDoc.data();

      // Save notification to in-app center
      const notifRef = db.collection('employers').doc(job.employer).collection('notifications').doc();
      const notifData = {
        title: 'New Job Application',
        body: `${worker.name} has applied for your job: ${job.title}`,
        data: { jobId, applicationId: targetId, type: 'new_application' },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await notifRef.set(notifData);

      // Send push notification
      if (employerData.fcmToken) {
        await sendPushNotification(
          employerData.fcmToken,
          notifData.title,
          notifData.body,
          { ...notifData.data, id: notifRef.id }
        );
      }
    }
  } catch (err) {
    logger.error(`FCM: Error triggering notification for application ${targetId}:`, err.message);
  }
  // --- End Trigger ---

  logger.info(`Application saved successfully in Firestore: ${targetId}`);

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully',
    data: { ...applicationData, id: targetId, _id: targetId }
  });
}));

// Get applications by employer ID
router.get('/employer/:employerId', asyncHandler(async (req, res) => {
  const { employerId } = req.params;
  const { status } = req.query;

  logger.info(`Fetching applications from Firestore for employer: ${employerId}`);

  let query = db.collection('applications').where('employer', '==', employerId);
  if (status) {
    query = query.where('status', '==', status);
  }

  const snapshot = await query.get();
  const applications = snapshot.docs.map(mapApplication).sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return dateB - dateA;
  });

  res.status(200).json({
    success: true,
    count: applications.length,
    data: applications
  });
}));

// Get applications by job ID
router.get('/job/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { status } = req.query;

  logger.info(`Fetching applications from Firestore for job: ${jobId}`);

  let query = db.collection('applications').where('job', '==', jobId);
  if (status) {
    query = query.where('status', '==', status);
  }

  const snapshot = await query.get();
  const applications = snapshot.docs.map(mapApplication).sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return dateB - dateA;
  });

  res.status(200).json({
    success: true,
    count: applications.length,
    data: applications
  });
}));

// Get a specific application by ID
router.get('/:applicationId', asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  logger.info(`Fetching application by ID from Firestore: ${applicationId}`);

  const applicationDoc = await db.collection('applications').doc(applicationId).get();

  if (!applicationDoc.exists) {
    logger.warn(`Application not found: ${applicationId}`);
    throw new NotFoundError('Application not found');
  }

  const application = applicationDoc.data();

  res.json({
    success: true,
    data: {
      ...application,
      id: applicationDoc.id,
      _id: applicationDoc.id
    }
  });
}));

// Get worker's current applications
router.get('/worker/:workerId/current', asyncHandler(async (req, res) => {
  const { workerId } = req.params;

  logger.info(`Fetching current applications from Firestore for worker: ${workerId}`);

  const snapshot = await db.collection('applications')
    .where('worker', '==', workerId)
    .where('status', 'in', ['applied', 'accepted', 'working', 'in-progress', 'APPLIED', 'ACCEPTED', 'WORKING', 'pending'])
    .get();

  const applications = snapshot.docs.map(mapApplication).sort((a, b) => {
    const dateA = a.appliedAt?.toDate ? a.appliedAt.toDate() : new Date(a.appliedAt || 0);
    const dateB = b.appliedAt?.toDate ? b.appliedAt.toDate() : new Date(b.appliedAt || 0);
    return dateB - dateA;
  });

  res.json({
    success: true,
    data: applications,
    count: applications.length
  });
}));

// Get worker's completed applications (Past Jobs)
router.get('/worker/:workerId/completed', asyncHandler(async (req, res) => {
  const { workerId } = req.params;

  logger.info(`Fetching completed applications from Firestore for worker: ${workerId}`);

  const snapshot = await db.collection('applications')
    .where('worker', '==', workerId)
    .where('status', 'in', ['completed', 'paid', 'COMPLETED', 'PAID', 'FINISHED'])
    .get();

  const applications = snapshot.docs.map(mapApplication).sort((a, b) => {
    const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt || 0);
    const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt || 0);
    return dateB - dateA;
  });

  res.json({
    success: true,
    data: applications,
    count: applications.length
  });
}));

// Enhanced application status update with comprehensive validation and flow management (Firestore)
router.patch('/:applicationId/status', asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const { status, transitionReason, updatedBy } = req.body;

  logger.info(`ROBUSTNESS_CHECK: H2 - Entering status update for application ${applicationId}`, { status });

  const validStatuses = ['applied', 'accepted', 'working', 'completed', 'paid', 'finished', 'rejected', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new ValidationError('Invalid status. Must be one of: ' + validStatuses.join(', '));
  }

  const applicationRef = db.collection('applications').doc(applicationId);
  const applicationSnap = await applicationRef.get();
  if (!applicationSnap.exists) {
    throw new NotFoundError('Application not found');
  }
  const currentApplication = applicationSnap.data();
  const currentStatus = currentApplication.status;

  const validTransitions = {
    'applied': ['accepted', 'rejected'],
    'accepted': ['working', 'cancelled'],
    'working': ['completed', 'cancelled'],
    'completed': ['paid'],
    'paid': ['finished'],
    'finished': [],
    'rejected': [],
    'cancelled': []
  };

  if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(status)) {
    throw new ValidationError(`Invalid status transition from ${currentStatus} to ${status}`);
  }

  // TWO-STAGE PAYMENT: Stage 1 - Acceptance (Base Price)
  if (status === 'accepted' && currentStatus === 'applied') {
    logger.info(`💰 Processing Stage 1 Payment (Acceptance) for application ${applicationId}`);

    await db.runTransaction(async (transaction) => {
      const appDoc = await transaction.get(applicationRef);
      const appData = appDoc.data();
      const jobRef = db.collection('jobs').doc(appData.job);
      const jobDoc = await transaction.get(jobRef);

      if (!jobDoc.exists) throw new NotFoundError('Job not found');
      const jobData = jobDoc.data();
      const basePrice = jobData.salary || jobData.baseAmount || 0;

      const employerRef = db.collection('employers').doc(appData.employer);
      const workerRef = db.collection('workers').doc(appData.worker);

      const employerDoc = await transaction.get(employerRef);
      const workerDoc = await transaction.get(workerRef);

      if (!employerDoc.exists) throw new NotFoundError('Employer not found');
      if (!workerDoc.exists) throw new NotFoundError('Worker not found');

      const employerData = employerDoc.data();
      const workerData = workerDoc.data();

      // Update Employer Wallet
      const empWallet = employerData.wallet || { totalBalance: 0, spentAmount: 0 };
      transaction.update(employerRef, {
        'wallet.totalBalance': (empWallet.totalBalance || 0) - basePrice,
        'updatedAt': admin.firestore.FieldValue.serverTimestamp()
      });

      // Update Worker Wallet (Net Worth)
      const workWallet = workerData.wallet || { totalBalance: 0, totalEarnings: 0 };
      transaction.update(workerRef, {
        'wallet.totalBalance': (workWallet.totalBalance || 0) + basePrice,
        'updatedAt': admin.firestore.FieldValue.serverTimestamp()
      });

      // Update Application
      transaction.update(applicationRef, {
        status,
        baseAmount: basePrice,
        baseAmountPaid: true,
        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update Job
      transaction.update(jobRef, {
        status: 'accepted',
        acceptedApplicationId: applicationId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Add transaction history records
      const empTransRef = employerRef.collection('transactions').doc();
      transaction.set(empTransRef, {
        type: 'debit',
        amount: basePrice,
        description: `Base price for job: ${jobData.title} (Accepted Worker)`,
        jobId: appData.job,
        applicationId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const workTransRef = workerRef.collection('transactions').doc();
      transaction.set(workTransRef, {
        type: 'credit_pending',
        amount: basePrice,
        description: `Base price for job: ${jobData.title} (Committed)`,
        jobId: appData.job,
        applicationId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    logger.info(`✅ Stage 1 Payment and Acceptance completed for ${applicationId}`);

    // --- Application Accepted Notification Trigger ---
    try {
      const workerDoc = await db.collection('workers').doc(appData.worker).get();
      if (workerDoc.exists) {
        const workerData = workerDoc.data();

        // Save to In-App center
        const notifRef = db.collection('workers').doc(appData.worker).collection('notifications').doc();
        const notifData = {
          title: "You've been hired! 🎉",
          body: `Employer accepted your application for: ${jobData.title}`,
          data: { jobId: appData.job, applicationId, type: 'status_update', status: 'accepted' },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await notifRef.set(notifData);

        // Send Push
        if (workerData.fcmToken) {
          await sendPushNotification(
            workerData.fcmToken,
            notifData.title,
            notifData.body,
            { ...notifData.data, id: notifRef.id }
          );
        }
      }
    } catch (err) {
      logger.error(`FCM: Error triggering accepted notification for ${applicationId}:`, err.message);
    }
    // --- End Trigger ---
  } else {
    // Standard status update for other transitions
    const updateData = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      [`${status}At`]: admin.firestore.FieldValue.serverTimestamp()
    };

    await applicationRef.update(updateData);

    // --- Employer Notifications for Work Progress ---
    try {
      if (status === 'working' || status === 'completed') {
        const employerDoc = await db.collection('employers').doc(currentApplication.employer).get();
        if (employerDoc.exists && employerDoc.data().fcmToken) {
          const title = status === 'working' ? 'Work Started! 🚀' : 'Job Done! 🏁';
          const body = status === 'working'
            ? `${currentApplication.workerSnippet?.name || 'Worker'} has started working on: ${currentApplication.jobSnippet?.title}`
            : `${currentApplication.workerSnippet?.name || 'Worker'} marked the job as done: ${currentApplication.jobSnippet?.title}. Please review and release payment.`;

          // Save to In-App center for Employer
          const notifRef = db.collection('employers').doc(currentApplication.employer).collection('notifications').doc();
          await notifRef.set({
            title,
            body,
            data: { jobId: currentApplication.job, applicationId, type: 'status_update', status },
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Send Push
          await sendPushNotification(
            employerDoc.data().fcmToken,
            title,
            body,
            { applicationId, type: 'status_update', status, id: notifRef.id }
          );
        }
      }
    } catch (err) {
      logger.error(`FCM: Error triggering employer notification for ${applicationId} (${status}):`, err.message);
    }
    // --- End Trigger ---

    // --- Application Rejected/Other Notification Trigger ---
    if (status === 'rejected') {
      try {
        const workerDoc = await db.collection('workers').doc(currentApplication.worker).get();
        if (workerDoc.exists && workerDoc.data().fcmToken) {
          await sendPushNotification(
            workerDoc.data().fcmToken,
            'Application Update',
            `Your application for ${currentApplication.jobSnippet?.title || 'a job'} was rejected.`,
            { applicationId, type: 'status_update', status: 'rejected' }
          );
        }
      } catch (err) {
        logger.error(`FCM: Error triggering rejected notification for ${applicationId}:`, err.message);
      }
    }
    // --- End Trigger ---
  }

  // Add status history record (outside transaction or could be inside)
  await applicationRef.collection('statusHistory').add({
    status,
    changedAt: admin.firestore.FieldValue.serverTimestamp(),
    previousStatus: currentStatus,
    note: transitionReason || `Status changed from ${currentStatus} to ${status}`,
    updatedBy: updatedBy || 'system'
  });

  const updatedDoc = await applicationRef.get();
  const application = mapApplication(updatedDoc);

  res.json({
    success: true,
    message: `Application ${status} successfully`,
    data: application,
    statusTransition: {
      from: currentStatus,
      to: status,
      timestamp: new Date().toISOString(),
      reason: transitionReason
    }
  });
}));

// TWO-STAGE PAYMENT: Stage 2 - Finalization (Additional Charges)
router.post('/:applicationId/employer-finish', asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const { additionalCharges = 0 } = req.body;
  const charges = parseFloat(additionalCharges) || 0;

  logger.info(`🏁 Processing Stage 2 Payment (Finalization) for application ${applicationId} with additional charges: ₹${charges}`);

  const applicationRef = db.collection('applications').doc(applicationId);
  const applicationSnap = await applicationRef.get();
  if (!applicationSnap.exists) throw new NotFoundError('Application not found');
  const appData = applicationSnap.data();

  // Validate current status - should be 'working' or 'payment_pending'
  if (!['working', 'payment_pending', 'in-progress'].includes(appData.status?.toLowerCase())) {
    throw new ValidationError(`Cannot finalize job from status: ${appData.status}`);
  }

  await db.runTransaction(async (transaction) => {
    const jobRef = db.collection('jobs').doc(appData.job);
    const jobDoc = await transaction.get(jobRef);
    if (!jobDoc.exists) throw new NotFoundError('Job not found');
    const jobData = jobDoc.data();

    const employerRef = db.collection('employers').doc(appData.employer);
    const workerRef = db.collection('workers').doc(appData.worker);

    const employerDoc = await transaction.get(employerRef);
    const workerDoc = await transaction.get(workerRef);

    if (!employerDoc.exists) throw new NotFoundError('Employer not found');
    if (!workerDoc.exists) throw new NotFoundError('Worker not found');

    const employerData = employerDoc.data();
    const workerData = workerDoc.data();
    const basePrice = appData.baseAmount || jobData.salary || jobData.baseAmount || 0;
    const totalPrice = basePrice + charges;

    // Update Employer Wallet
    const empWallet = employerData.wallet || { totalBalance: 0, spentAmount: 0 };
    transaction.update(employerRef, {
      'wallet.totalBalance': (empWallet.totalBalance || 0) - charges,
      'wallet.spentAmount': (empWallet.spentAmount || 0) + totalPrice,
      'updatedAt': admin.firestore.FieldValue.serverTimestamp()
    });

    // Update Worker Wallet (Net Worth, Liquid Cash, Lifetime History)
    const workWallet = workerData.wallet || { totalBalance: 0, totalEarnings: 0, withdrawableBalance: 0 };
    transaction.update(workerRef, {
      'wallet.totalBalance': (workWallet.totalBalance || 0) + charges,
      'balance': (workerData.balance || 0) + totalPrice, // Legacy field
      'wallet.withdrawableBalance': (workWallet.withdrawableBalance || 0) + totalPrice,
      'wallet.totalEarnings': (workWallet.totalEarnings || 0) + totalPrice,
      'updatedAt': admin.firestore.FieldValue.serverTimestamp()
    });

    // Update Application
    transaction.update(applicationRef, {
      status: 'completed',
      additionalCharges: charges,
      totalPayment: totalPrice,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update Job
    transaction.update(jobRef, {
      status: 'completed',
      totalPayment: totalPrice,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Add transaction history records
    if (charges > 0) {
      const empTransRef = employerRef.collection('transactions').doc();
      transaction.set(empTransRef, {
        type: 'debit',
        amount: charges,
        description: `Additional charges for job: ${jobData.title}`,
        jobId: appData.job,
        applicationId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const workTransRef = workerRef.collection('transactions').doc();
      transaction.set(workTransRef, {
        type: 'credit',
        amount: charges,
        description: `Additional charges for job: ${jobData.title}`,
        jobId: appData.job,
        applicationId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Final settlement record
    const workFinalTransRef = workerRef.collection('transactions').doc();
    transaction.set(workFinalTransRef, {
      type: 'credit',
      amount: totalPrice,
      description: `Final payout released for job: ${jobData.title}`,
      jobId: appData.job,
      applicationId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  // --- Push Notification Trigger ---
  try {
    const workerDoc = await db.collection('workers').doc(appData.worker).get();
    if (workerDoc.exists) {
      const workerData = workerDoc.data();

      // Save notification to in-app center
      const notifRef = db.collection('workers').doc(appData.worker).collection('notifications').doc();
      const notifData = {
        title: 'Payment Received! 💰',
        body: `₹${appData.baseAmount + charges} has been added to your wallet for: ${appData.jobSnippet?.title || 'Completed Job'}`,
        data: { applicationId, type: 'payment_received' },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await notifRef.set(notifData);

      // Send push notification
      if (workerData.fcmToken) {
        await sendPushNotification(
          workerData.fcmToken,
          notifData.title,
          notifData.body,
          { ...notifData.data, id: notifRef.id }
        );
      }
    }
  } catch (err) {
    logger.error(`FCM: Error triggering notification for payment ${applicationId}:`, err.message);
  }
  // --- End Trigger ---

  logger.info(`✅ Stage 2 Payment and Finalization completed for ${applicationId}`);

  res.json({
    success: true,
    message: 'Job finalized and payment released successfully',
    totalPaid: appData.baseAmount + charges
  });
}));

// Start Work (Transition to working state)
router.post('/:applicationId/start-work', asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  logger.info(`🚀 Starting work for application: ${applicationId}`);

  const applicationRef = db.collection('applications').doc(applicationId);
  const applicationSnap = await applicationRef.get();

  if (!applicationSnap.exists) {
    throw new NotFoundError('Application not found');
  }

  const appData = applicationSnap.data();

  // Validate current status - should be 'accepted'
  if (appData.status !== 'accepted' && appData.status !== 'ACCEPTED') {
    throw new ValidationError(`Cannot start work from status: ${appData.status}. Application must be accepted first.`);
  }

  const jobRef = db.collection('jobs').doc(appData.job);
  const jobSnap = await jobRef.get();

  if (!jobSnap.exists) {
    throw new NotFoundError('Job not found');
  }

  const jobData = jobSnap.data();

  // Use a transaction for atomic update
  await db.runTransaction(async (transaction) => {
    // 1. Update Application status
    transaction.update(applicationRef, {
      status: 'working',
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Update Job status
    transaction.update(jobRef, {
      status: 'working',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. Add to status history
    const historyRef = applicationRef.collection('statusHistory').doc();
    transaction.set(historyRef, {
      status: 'working',
      changedAt: admin.firestore.FieldValue.serverTimestamp(),
      previousStatus: appData.status,
      note: 'Work started by participant',
      updatedBy: 'system'
    });
  });

  // --- Notifications ---
  try {
    // Notify Employer
    const employerDoc = await db.collection('employers').doc(appData.employer).get();
    if (employerDoc.exists) {
      const employerData = employerDoc.data();
      const notifRef = db.collection('employers').doc(appData.employer).collection('notifications').doc();
      const notifData = {
        title: 'Work Started! 🚀',
        body: `${appData.workerSnippet?.name || 'Worker'} has started working on: ${jobData.title}`,
        data: { jobId: appData.job, applicationId, type: 'status_update', status: 'working' },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await notifRef.set(notifData);

      if (employerData.fcmToken) {
        await sendPushNotification(employerData.fcmToken, notifData.title, notifData.body, { ...notifData.data, id: notifRef.id });
      }
    }

    // Notify Worker
    const workerDoc = await db.collection('workers').doc(appData.worker).get();
    if (workerDoc.exists) {
      const workerData = workerDoc.data();
      const notifRef = db.collection('workers').doc(appData.worker).collection('notifications').doc();
      const notifData = {
        title: 'Work Started! 🚀',
        body: `You have successfully started working on: ${jobData.title}`,
        data: { jobId: appData.job, applicationId, type: 'status_update', status: 'working' },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await notifRef.set(notifData);

      if (workerData.fcmToken) {
        await sendPushNotification(workerData.fcmToken, notifData.title, notifData.body, { ...notifData.data, id: notifRef.id });
      }
    }
  } catch (err) {
    logger.error(`FCM: Error triggering notification for start-work ${applicationId}:`, err.message);
  }

  res.json({
    success: true,
    message: 'Work started successfully',
    data: {
      applicationId,
      status: 'working',
      startedAt: new Date().toISOString()
    }
  });
}));

// Worker Finish (Worker signals work is done)
router.post('/:applicationId/worker-finish', asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  logger.info(`🏁 Worker signaling work is done for application: ${applicationId}`);

  const applicationRef = db.collection('applications').doc(applicationId);
  const applicationSnap = await applicationRef.get();

  if (!applicationSnap.exists) {
    throw new NotFoundError('Application not found');
  }

  const appData = applicationSnap.data();

  // Validate current status - should be 'working' or 'in-progress'
  if (!['working', 'in-progress'].includes(appData.status?.toLowerCase())) {
    throw new ValidationError(`Cannot mark work finished from status: ${appData.status}`);
  }

  await applicationRef.update({
    workerConfirmedFinish: true,
    status: 'payment_pending',
    workerFinishedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Add to status history
  await applicationRef.collection('statusHistory').add({
    status: 'payment_pending',
    changedAt: admin.firestore.FieldValue.serverTimestamp(),
    previousStatus: appData.status,
    note: 'Worker marked work as finished',
    updatedBy: 'worker'
  });

  // --- Notification Trigger (Notify Employer) ---
  try {
    const employerDoc = await db.collection('employers').doc(appData.employer).get();
    if (employerDoc.exists && employerDoc.data().fcmToken) {
      const employerData = employerDoc.data();
      const title = 'Work Finished! 🏁';
      const body = `${appData.workerSnippet?.name || 'Worker'} has completed the job: ${appData.jobSnippet?.title}. Please verify and release final payment.`;

      // Save to In-App center for Employer
      const notifRef = db.collection('employers').doc(appData.employer).collection('notifications').doc();
      await notifRef.set({
        title,
        body,
        data: { jobId: appData.job, applicationId, type: 'status_update', status: 'payment_pending' },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Send Push
      await sendPushNotification(
        employerData.fcmToken,
        title,
        body,
        { applicationId, type: 'status_update', status: 'payment_pending', id: notifRef.id }
      );
    }
  } catch (err) {
    logger.error(`FCM: Error triggering notification for worker-finish ${applicationId}:`, err.message);
  }

  res.json({
    success: true,
    message: 'Work marked as finished successfully',
    data: {
      applicationId,
      status: 'payment_pending'
    }
  });
}));

// Cancel/Delete application
router.delete('/:applicationId', asyncHandler(async (req, res) => {
  const { applicationId } = req.params;

  logger.info(`🗑️ Withdrawing application: ${applicationId}`);

  const applicationSnap = await db.collection('applications').doc(applicationId).get();
  if (!applicationSnap.exists) {
    return res.status(404).json({
      success: false,
      message: 'Application not found'
    });
  }
  const application = applicationSnap.data();

  // Only allow withdrawal for applied/accepted status
  if (!['applied', 'accepted', 'APPLIED', 'ACCEPTED'].includes(application.status)) {
    return res.status(400).json({
      success: false,
      message: 'Cannot cancel application in current status'
    });
  }

  await db.collection('applications').doc(applicationId).delete();
  logger.info(`✅ Application deleted: ${applicationId}`);

  // Decrement job's applicantCount
  if (application.job) {
    db.collection('jobs').doc(application.job).update({
      applicantCount: admin.firestore.FieldValue.increment(-1)
    }).catch(err => logger.warn(`⚠️ Could not decrement job applicantCount: ${err.message}`));
  }

  res.json({
    success: true,
    message: 'Application withdrawn successfully',
    data: {
      applicationId,
      jobId: application.job,
      workerId: application.worker
    }
  });
}));

module.exports = router;

