const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');
const Job = require('../models/Job');
const auth = require('../middleware/auth');

// Rate a worker (only employers can rate workers)
router.post('/worker/:id', auth, async (req, res) => {
  try {
    const { score, comment, jobId } = req.body;

    // Debug logging
    console.log('Rating request:', {
      userId: req.user._id,
      userRole: req.user.role,
      workerId: req.params.id,
      jobId: jobId
    });

    // Validate rating score
    if (score < 0 || score > 100) {
      return res.status(400).json({ message: 'Rating must be between 0 and 100' });
    }

    // Validate comment
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ message: 'Comment is required' });
    }
    if (comment.length > 500) {
      return res.status(400).json({ message: 'Comment must be less than 500 characters' });
    }

    // Verify that the rater is an employer
    if (!req.user || req.user.role !== 'employer') {
      return res.status(403).json({ message: 'Only employers can rate workers' });
    }

    // Find the worker
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Find and verify the job
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Debug logging
    console.log('Job details:', {
      jobId: job._id,
      jobEmployer: job.employer,
      jobWorker: job.selectedWorker,
      jobStatus: job.status,
      requestEmployer: req.user._id
    });

    // Verify job is completed
    if (job.status !== 'completed') {
      return res.status(400).json({ message: 'Cannot rate an incomplete job' });
    }

    // Verify job belongs to the correct worker and employer
    if (!job.selectedWorker || !job.employer || 
        job.selectedWorker.toString() !== worker._id.toString() || 
        job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to rate this job' });
    }

    // Check for duplicate rating
    const existingRating = worker.ratings.find(r => r.job.toString() === jobId.toString());
    if (existingRating) {
      return res.status(400).json({ message: 'Job has already been rated' });
    }

    // Add the new rating
    worker.ratings.unshift({  // Add to beginning of array for chronological order
      score,
      comment,
      employer: req.user._id,
      job: jobId,
      createdAt: new Date()
    });

    // Update ShaktiScore
    worker.updateShaktiScore(score);

    // Save the worker
    await worker.save();

    res.status(200).json({
      message: 'Rating submitted successfully',
      newShaktiScore: worker.shaktiScore
    });
  } catch (error) {
    console.error('Rating Error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 