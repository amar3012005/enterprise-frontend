const express = require('express');
const router = express.Router();
const { admin, db } = require('../config/firebase');
const logger = require('../config/logger');
const {
  asyncHandler,
  validateRequired,
  NotFoundError,
  BusinessLogicError,
  createSuccessResponse
} = require('../middleware/errorHandler');

const mapJob = (doc) => ({ ...doc.data(), id: doc.id, _id: doc.id });
const chunkArray = (arr, size = 10) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

// Test endpoint to confirm backend connectivity for job creation
router.post('/initiate-creation', async (req, res) => {
  console.log('🎉 Job creation initiated!');
  logger.info('🎉 Job creation initiated!');

  res.json({
    success: true,
    message: 'Job creation initiated successfully!'
  });
});

// Get jobs with dual status system information (Firestore-native)
router.get('/dual-status', asyncHandler(async (req, res) => {
  const { workerId, employerId, category, status } = req.query;

  logger.info('📊 Fetching jobs with dual status system (Firestore)', {
    workerId: workerId || 'none',
    employerId: employerId || 'none',
    category: category || 'any',
    status: status || 'all'
  });

  let jobsQuery = db.collection('jobs');

  if (category && category !== 'undefined') {
    jobsQuery = jobsQuery.where('category', '==', category);
  }

  if (employerId && employerId !== 'undefined' && employerId !== 'null') {
    jobsQuery = jobsQuery.where('employer', '==', employerId);
  }

  if (status && status !== 'undefined') {
    jobsQuery = jobsQuery.where('status', '==', status);
  }

  const jobsSnapshot = await jobsQuery.orderBy('createdAt', 'desc').limit(50).get();
  const jobs = jobsSnapshot.docs.map(mapJob);

  let applicationMap = {};
  let countMap = {};

  const jobIds = jobs.map(j => j.id);

  for (const chunk of chunkArray(jobIds)) {
    const appsSnap = await db.collection('applications')
      .where('job', 'in', chunk)
      .get();

    appsSnap.docs.forEach(d => {
      const data = d.data();
      countMap[data.job] = (countMap[data.job] || 0) + 1;
    });

    if (workerId) {
      const workerAppsSnap = await db.collection('applications')
        .where('worker', '==', workerId)
        .where('job', 'in', chunk)
        .get();

      workerAppsSnap.docs.forEach(d => {
        const data = d.data();
        applicationMap[data.job] = { status: data.status, id: d.id };
      });
    }
  }

  const enhancedJobs = jobs.map(job => {
    const application = applicationMap[job.id];
    let workerStatus = job.workerStatus || 'active';
    let employerStatus = job.employerStatus || 'active';

    if (application) {
      workerStatus = 'applied';
      if (application.status === 'accepted' || application.status === 'in-progress') {
        employerStatus = 'accepted';
      } else if (application.status === 'completed' && job.paymentStatus === 'paid') {
        employerStatus = 'paid';
        workerStatus = 'got paid';
      }
    }

    return {
      ...job,
      applicantCount: countMap[job.id] || 0,
      workerStatus,
      employerStatus,
      applicationStatus: application ? application.status : null,
      applicationId: application ? application.id : null,
      hasApplied: !!application
    };
  });

  res.json({
    success: true,
    jobs: enhancedJobs,
    count: enhancedJobs.length,
    statusInfo: {
      workerStatuses: ['active', 'applied', 'accepted', 'got paid'],
      employerStatuses: ['active', 'accepted', 'paid'],
      legacyStatuses: ['active', 'in-progress', 'completed', 'cancelled']
    }
  });
}));

// Create a new job
router.post('/', asyncHandler(async (req, res) => {
  logger.info('New job posting attempt', {
    employer: req.body.employer,
    title: req.body.title,
    body: req.body
  });

  // Validate required fields
  validateRequired(req.body, ['title', 'employer']);

  // Check for duplicate job posting (relaxed timing) in Firestore
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const dupQuery = await db.collection('jobs')
    .where('title', '==', req.body.title)
    .where('employer', '==', req.body.employer)
    .limit(5)
    .get();

  const duplicate = dupQuery.docs.find(doc => {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || 0);
    const sameCity = !req.body.location?.city || (data.location?.city === req.body.location?.city);
    return createdAt > fiveMinutesAgo && sameCity;
  });

  if (duplicate) {
    logger.warn('Duplicate job submission detected (Firestore)', {
      existingJobId: duplicate.id,
      newJobTitle: req.body.title
    });
    throw new BusinessLogicError('A similar job was already posted in the last 5 minutes', 'DUPLICATE_JOB');
  }

  // Verify employer exists in Firestore
  const employerDoc = await db.collection('employers').doc(req.body.employer).get();
  if (!employerDoc.exists) {
    logger.error('Employer not found in Firestore', { employerId: req.body.employer });
    throw new NotFoundError('Employer');
  }
  const employer = employerDoc.data();

  const targetId = db.collection('jobs').doc().id;
  const jobData = {
    title: req.body.title,
    description: req.body.description || 'Job description to be provided',
    category: req.body.category || 'General',
    salary: req.body.baseAmount || req.body.salary || 0,
    baseAmount: req.body.baseAmount || req.body.salary || 0,
    employer: req.body.employer,
    companyName: req.body.companyName || employer.company?.name || employer.name,
    employerSnippet: {
      name: employer.name,
      companyName: employer.company?.name || employer.name,
      rating: employer.rating?.average || 0,
      profilePicture: employer.profilePicture || ''
    },
    location: {
      type: req.body.location?.type || 'onsite',
      street: req.body.location?.street || '',
      city: req.body.location?.city || '',
      state: req.body.location?.state || '',
      pincode: req.body.location?.pincode || '',
      ...(req.body.location?.address && { address: req.body.location.address }),
      ...(req.body.location?.coordinates && {
        coordinates: {
          type: 'Point',
          coordinates: req.body.location.coordinates // [lng, lat]
        }
      })
    },
    employmentType: req.body.employmentType || 'Full-time',
    skillsRequired: req.body.skillsRequired || [],
    requirements: req.body.requirements || 'Basic requirements apply',
    status: 'POSTED',
    urgency: req.body.urgency || 'Normal',
    startDate: req.body.startDate || new Date(),
    endDate: req.body.endDate || new Date(Date.now() + 86400000),
    postingLocation: req.body.postingLocation || null, // Store exact coordinates and timestamp
    postingTimestamp: req.body.postingTimestamp || new Date().toISOString(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  logger.info('Creating job in Firestore:', jobData);

  await db.collection('jobs').doc(targetId).set(jobData);

  // Update employer's posted jobs list in Firestore (Background)
  db.collection('employers').doc(req.body.employer).update({
    postedJobs: admin.firestore.FieldValue.arrayUnion(targetId)
  }).catch(err => logger.warn(`⚠️ Failed to update employer postedJobs in Firestore: ${err.message}`));

  logger.info(`Job posted successfully in Firestore: ${jobData.title}`, { jobId: targetId });

  // --- New Job Notification Trigger ---
  try {
    const workersSnapshot = await db.collection('workers')
      .where('preferredCategory', '==', jobData.category)
      .get();

    if (!workersSnapshot.empty) {
      const tokens = workersSnapshot.docs
        .map(doc => doc.data().fcmToken)
        .filter(token => !!token);

      if (tokens.length > 0) {
        const { sendMulticastNotification } = require('../services/fcmService');
        await sendMulticastNotification(
          tokens,
          'New Job Alert! 📍',
          `${jobData.title} in ${jobData.location.city}`,
          { jobId: targetId, type: 'new_job' }
        );
      }
    }
  } catch (err) {
    logger.error('FCM: Error triggering new job notifications:', err.message);
  }
  // --- End Trigger ---

  res.status(201).json(createSuccessResponse({ ...jobData, id: targetId, _id: targetId }, 'Job posted successfully', 201));
}));

// Get all jobs (with filters)
router.get('/', async (req, res) => {
  try {
    const { status, location, workerId, category, minSalary, employmentType } = req.query;

    const logColor = '\x1b[36m'; // Cyan
    const resetColor = '\x1b[0m';
    console.log(`${logColor}[API] [GET] /api/jobs (Firestore) [workerId=${workerId || 'N/A'}] [status=${status}] [location=${location}] [category=${category}]${resetColor}`);

    const jobsRef = db.collection('jobs');

    let statuses = ['active', 'POSTED', 'APPLIED', 'in-progress'];
    if (status && status !== 'active,in-progress') {
      statuses = [status];
    }

    let query = jobsRef.where('status', 'in', statuses);

    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    let jobs = snapshot.docs.map(mapJob);

    if (location) {
      const locLower = location.toLowerCase();
      jobs = jobs.filter(job =>
        (job.location?.state?.toLowerCase().includes(locLower)) ||
        (job.location?.city?.toLowerCase().includes(locLower)) ||
        (job.location?.village?.toLowerCase().includes(locLower)) ||
        (job.location?.address?.toLowerCase().includes(locLower))
      );
    }

    if (minSalary) {
      jobs = jobs.filter(job => (job.salary || job.baseAmount || 0) >= parseInt(minSalary));
    }

    if (employmentType) {
      jobs = jobs.filter(job => job.employmentType === employmentType);
    }

    if (workerId) {
      const completedAppsSnapshot = await db.collection('applications')
        .where('worker', '==', workerId)
        .where('status', '==', 'completed')
        .get();

      const completedJobIds = completedAppsSnapshot.docs.map(doc => doc.data().job);
      jobs = jobs.filter(job => !completedJobIds.includes(job.id));
    }

    jobs.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    res.status(200).json(jobs);

  } catch (error) {
    logger.error('Error fetching jobs from Firestore:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error.message,
      data: []
    });
  }
});

// Get job count (lightweight endpoint)
router.get('/count', async (req, res) => {
  try {
    const { location, category, minSalary, employmentType, workerId, status } = req.query;

    logger.info('Job count request', {
      workerId,
      status,
      location,
      category,
      minSalary,
      employmentType
    });

    let statuses = ['active', 'in-progress', 'POSTED', 'APPLIED'];
    if (status && status !== 'active,in-progress') {
      statuses = [status];
    }

    let jobsQuery = db.collection('jobs').where('status', 'in', statuses);

    if (category) {
      jobsQuery = jobsQuery.where('category', '==', category);
    }

    if (employmentType) {
      jobsQuery = jobsQuery.where('employmentType', '==', employmentType);
    }

    const snapshot = await jobsQuery.get();
    let jobs = snapshot.docs.map(mapJob);

    if (location) {
      const locLower = location.toLowerCase();
      jobs = jobs.filter(job =>
        job.location?.state?.toLowerCase().includes(locLower) ||
        job.location?.city?.toLowerCase().includes(locLower) ||
        job.location?.village?.toLowerCase().includes(locLower)
      );
    }

    if (minSalary && !isNaN(minSalary)) {
      jobs = jobs.filter(job => (job.salary || job.baseAmount || 0) >= parseInt(minSalary, 10));
    }

    if (workerId) {
      const completedSnap = await db.collection('applications')
        .where('worker', '==', workerId)
        .where('status', '==', 'completed')
        .get();
      const completedJobIds = new Set(completedSnap.docs.map(d => d.data().job));
      jobs = jobs.filter(job => !completedJobIds.has(job.id));
    }

    const count = jobs.length;

    res.json({
      success: true,
      count,
      filters: req.query,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting job count', {
      error: error.message,
      stack: error.stack,
      query: req.query
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get job count',
      count: 0,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get list of unique cities with job counts
router.get('/cities', asyncHandler(async (req, res) => {
  const { status = 'active' } = req.query;

  logger.info(`Getting cities list for status: ${status}`);

  const jobsSnap = await db.collection('jobs')
    .where('status', 'in', [status, 'in-progress', 'POSTED', 'APPLIED'])
    .get();

  const cityMap = {};
  jobsSnap.docs.forEach(doc => {
    const data = doc.data();
    const city = data.location?.city;
    if (city) {
      if (!cityMap[city]) {
        cityMap[city] = { city, state: data.location?.state || '', count: 0 };
      }
      cityMap[city].count += 1;
    }
  });

  const cities = Object.values(cityMap).sort((a, b) => b.count - a.count);

  res.json({
    success: true,
    cities,
    count: cities.length
  });
}));

// Get recent jobs - Firestore
router.get('/recent', async (req, res) => {
  try {
    const { limit = 10, workerId } = req.query;

    logger.info(`Fetching recent jobs (Firestore), limit: ${limit}, workerId: ${workerId}`);

    let jobsQuery = db.collection('jobs')
      .where('status', 'in', ['active', 'in-progress', 'POSTED', 'APPLIED'])
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit));

    const snapshot = await jobsQuery.get();
    let jobs = snapshot.docs.map(mapJob);

    if (workerId) {
      const completedSnapshot = await db.collection('applications')
        .where('worker', '==', workerId)
        .where('status', '==', 'completed')
        .get();
      const completedJobIds = new Set(completedSnapshot.docs.map(d => d.data().job));
      jobs = jobs.filter(job => !completedJobIds.has(job.id));
    }

    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });

  } catch (error) {
    logger.error('Error fetching recent jobs', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent jobs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get jobs posted by an employer - Firestore
router.get('/employer/:employerId', async (req, res) => {
  try {
    const { employerId } = req.params;

    const jobsSnapshot = await db.collection('jobs')
      .where('employer', '==', employerId)
      .get();

    const jobs = jobsSnapshot.docs.map(mapJob).sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    res.json(jobs);

  } catch (error) {
    logger.error('Error fetching employer jobs', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      data: [],
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get applications for a specific job - Firestore
router.get('/:jobId/applications', async (req, res) => {
  try {
    const { jobId } = req.params;

    const applicationsSnap = await db.collection('applications')
      .where('job', '==', jobId)
      .get();

    const applications = applicationsSnap.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      _id: doc.id
    }));

    res.json({
      success: true,
      count: applications.length,
      data: applications
    });

  } catch (error) {
    logger.error('Error fetching job applications', {
      error: error.message,
      stack: error.stack,
      jobId: req.params.jobId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch job applications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get job by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Fetching job by ID from Firestore: ${id}`);

    const jobDoc = await db.collection('jobs').doc(id).get();

    if (!jobDoc.exists) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const jobData = jobDoc.data();

    const applicationsSnapshot = await db.collection('applications')
      .where('job', '==', id)
      .get();

    const applications = applicationsSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      _id: doc.id
    })).sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    res.json({
      ...jobData,
      id: jobDoc.id,
      _id: jobDoc.id,
      applications: applications
    });
  } catch (error) {
    logger.error(`Error fetching job by ID from Firestore: ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
});

// Enhanced job status update endpoint (Firestore)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    console.log(`🔄 Updating job ${id} status to: ${status}`);

    const validStatuses = ['active', 'in-progress', 'completed', 'paused', 'cancelled', 'POSTED', 'APPLIED', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const jobRef = db.collection('jobs').doc(id);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const updateData = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(status === 'completed' || status === 'COMPLETED' ? { completedAt: admin.firestore.FieldValue.serverTimestamp() } : {})
    };

    await jobRef.update(updateData);

    res.json({
      success: true,
      message: `Job status updated to ${status}`,
      statusTransition: {
        to: status,
        timestamp: new Date().toISOString(),
        reason: reason || 'Manual update'
      }
    });
  } catch (error) {
    console.error('❌ Error updating job status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job status',
      error: error.message
    });
  }
});

// Update job (Firestore)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const jobRef = db.collection('jobs').doc(id);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) {
      return res.status(404).json({ message: 'Job not found' });
    }

    await jobRef.update({
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const updated = await jobRef.get();
    logger.info(`Job updated successfully (Firestore): ${id}`);
    res.json({
      ...updated.data(),
      id: updated.id,
      _id: updated.id
    });
  } catch (error) {
    logger.error(`Error updating job: ${req.params.id}`, { error: error.message, stack: error.stack });
    res.status(400).json({ message: error.message });
  }
});

// Delete job (Firestore)
router.delete('/:id', async (req, res) => {
  try {
    const jobId = req.params.id;

    const jobDoc = await db.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const jobData = jobDoc.data();

    const appsSnap = await db.collection('applications').where('job', '==', jobId).limit(1).get();
    if (!appsSnap.empty) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete job with existing applications.'
      });
    }

    await db.collection('jobs').doc(jobId).delete();

    if (jobData.employer) {
      db.collection('employers').doc(jobData.employer).update({
        postedJobs: admin.firestore.FieldValue.arrayRemove(jobId)
      }).catch(() => { });
    }

    logger.info(`Job deleted successfully (Firestore): ${jobId}`);
    res.json({
      success: true,
      message: 'Job deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting job', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

