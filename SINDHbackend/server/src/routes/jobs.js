const express = require('express');
const router = express.Router();
const JobController = require('../controllers/jobController');
const auth = require('../middleware/auth');

// Create a new job (requires authentication)
router.post('/', auth, JobController.createJob);

// Update a job (requires authentication)
router.put('/:id', auth, JobController.updateJob);

// Get job by ID (public)
router.get('/:jobId', JobController.getJobById);

// Apply for a job (requires authentication)
router.post('/:jobId/apply', auth, JobController.applyForJob);

// Get matching jobs for a worker (requires authentication)
router.get('/worker/:workerId/matches', auth, JobController.getMatchingJobs);

module.exports = router; 