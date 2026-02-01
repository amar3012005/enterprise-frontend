const { db } = require('../config/firebase');
const NotificationService = require('./notificationService');

class JobMatchingService {
  // Calculate match score between worker and job
  calculateMatchScore(worker, job) {
    let score = 0;
    const weights = {
      skills: 0.4,
      experience: 0.3,
      location: 0.3
    };

    // Skills match
    if (worker.skills && worker.skills.length > 0) {
      const skillScore = 1; // Basic skill match
      score += skillScore * weights.skills;
    }

    // Experience match
    if (worker.experience_years || worker.experience) {
      score += weights.experience;
    }

    // Location match (using city and state)
    const locationScore = this.calculateLocationScore(worker, job);
    score += locationScore * weights.location;

    return score;
  }

  // Calculate location match score based on city and state
  calculateLocationScore(worker, job) {
    let score = 0;

    // Check if state matches
    if (worker.location?.state === job.location?.state) {
      score += 0.6;

      // If city also matches, add more points
      if (worker.location?.district === job.location?.city || worker.location?.city === job.location?.city) {
        score += 0.4;
      }
    }

    return score;
  }

  // Find matching workers for a job
  async findMatchingWorkers(job, minMatchScore = 0.6) {
    try {
      // Find workers in the same state from Firestore
      const snapshot = await db.collection('workers')
        .where('location.state', '==', job.location?.state)
        .where('isAvailable', '==', true)
        .get();

      const nearbyWorkers = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        _id: doc.id
      }));

      // Calculate match scores for nearby workers
      const matchedWorkers = nearbyWorkers
        .map(worker => ({
          worker,
          score: this.calculateMatchScore(worker, job)
        }))
        .filter(match => match.score >= minMatchScore)
        .sort((a, b) => b.score - a.score);

      return matchedWorkers;
    } catch (error) {
      console.error('Error finding matching workers in Firestore:', error);
      throw error;
    }
  }

  // Find matching jobs for a worker
  async findMatchingJobs(worker, minMatchScore = 0.6) {
    try {
      // Find jobs in the same state from Firestore
      const snapshot = await db.collection('jobs')
        .where('location.state', '==', worker.location?.state)
        .where('status', 'in', ['active', 'POSTED', 'APPLIED'])
        .get();

      const nearbyJobs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        _id: doc.id
      }));

      // Calculate match scores for nearby jobs
      const matchedJobs = nearbyJobs
        .map(job => ({
          job,
          score: this.calculateMatchScore(worker, job)
        }))
        .filter(match => match.score >= minMatchScore)
        .sort((a, b) => b.score - a.score);

      return matchedJobs;
    } catch (error) {
      console.error('Error finding matching jobs in Firestore:', error);
      throw error;
    }
  }

  // Notify matching workers about a new job
  async notifyMatchingWorkers(job) {
    try {
      const matches = await this.findMatchingWorkers(job);

      // Notify workers with high match scores
      for (const match of matches) {
        if (match.score >= 0.8) { // Only notify workers with very good matches
          await NotificationService.notifyWorkerAboutJob(match.worker, job);
        }
      }

      return matches.length;
    } catch (error) {
      console.error('Error notifying matching workers:', error);
      throw error;
    }
  }

  /**
   * Accept a job and create job application
   * @param {string} jobId - The ID of the job
   * @param {string} workerId - The ID of the worker
   * @returns {Promise<Object>} The created job application
   */
  async acceptJob(jobId, workerId) {
    try {
      // Get the job details
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Check if worker already applied
      const existingApplication = await JobApplication.findOne({
        job: jobId,
        worker: workerId
      });

      if (existingApplication) {
        throw new Error('Already applied to this job');
      }

      // Create new job application
      const jobApplication = new JobApplication({
        job: jobId,
        worker: workerId,
        employer: job.employerId,
        status: 'accepted',
        appliedAt: new Date()
      });

      await jobApplication.save();

      // Notify employer
      await NotificationService.notifyEmployer(job.employerId, {
        type: 'JOB_APPLICATION',
        message: `A worker has accepted your job posting: ${job.title}`,
        jobId: jobId,
        workerId: workerId
      });

      return jobApplication;
    } catch (error) {
      console.error('Error in acceptJob:', error);
      throw error;
    }
  }

  /**
   * Update job application status
   * @param {string} applicationId - The ID of the job application
   * @param {string} status - New status (pending, accepted, completed)
   */
  async updateJobStatus(applicationId, status) {
    try {
      const application = await JobApplication.findById(applicationId);
      if (!application) {
        throw new Error('Job application not found');
      }

      application.status = status;
      if (status === 'completed') {
        application.completedAt = new Date();
      }

      await application.save();

      // Notify relevant parties
      const notificationMessage = this.getStatusNotificationMessage(status);
      await NotificationService.notifyBoth(application.employer, application.worker, {
        type: 'JOB_STATUS_UPDATE',
        message: notificationMessage,
        jobId: application.job,
        status: status
      });

      return application;
    } catch (error) {
      console.error('Error in updateJobStatus:', error);
      throw error;
    }
  }

  getStatusNotificationMessage(status) {
    switch (status) {
      case 'accepted':
        return 'Your job application has been accepted';
      case 'completed':
        return 'The job has been marked as completed';
      case 'pending':
        return 'Your job application is pending review';
      default:
        return 'Your job application status has been updated';
    }
  }
}

module.exports = new JobMatchingService();