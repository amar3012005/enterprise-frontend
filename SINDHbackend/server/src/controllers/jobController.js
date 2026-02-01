const Job = require('../models/Job');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const NotificationService = require('../services/notificationService');

// Apply for a job
exports.applyForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { workerId } = req.body;

    // Find the worker first
    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Update the job and get the updated document in one operation
    const updatedJob = await Job.findOneAndUpdate(
      {
        _id: jobId,
        'applications.worker': { $ne: workerId } // Make sure worker hasn't already applied
      },
      {
        $push: {
          applications: {
            worker: workerId,
            status: 'pending',
            appliedAt: new Date()
          }
        }
      },
      {
        new: true, // Return the updated document
        runValidators: true // Run schema validators
      }
    ).populate('employer')
      .populate('applications.worker');

    if (!updatedJob) {
      // Check if job exists
      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      // If job exists but update failed, worker has already applied
      return res.status(400).json({ message: 'Already applied to this job' });
    }

    // Notify employer about the application
    const employer = await Employer.findById(updatedJob.employer);
    await NotificationService.notifyEmployerAboutApplication(employer, worker, updatedJob);

    res.json(updatedJob);
  } catch (error) {
    console.error('Error in job application:', error);
    res.status(500).json({ message: 'Error applying for job', error: error.message });
  }
};

// Get job by ID
exports.getJobById = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId)
      .populate('employer')
      .populate('applications.worker');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error getting job:', error);
    res.status(500).json({ message: 'Error getting job details', error: error.message });
  }
}; 