const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');
const Worker = require('../models/Worker');
const logger = require('../config/logger');

/**
 * Status Transition Middleware
 * Validates and enforces proper status transitions for jobs and applications
 */

// Valid status transitions for Job
const VALID_JOB_TRANSITIONS = {
    'posted': ['applied', 'cancelled'],
    'applied': ['accepted', 'cancelled'],
    'accepted': ['working', 'cancelled'],
    'working': ['payment_pending', 'cancelled'],
    'payment_pending': ['paid'],
    'paid': ['finished'],
    'finished': [],
    'cancelled': []
};

// Valid status transitions for JobApplication
const VALID_APPLICATION_TRANSITIONS = {
    'applied': ['accepted', 'declined', 'cancelled'],
    'accepted': ['working', 'cancelled'],
    'declined': [],
    'working': ['payment_pending', 'cancelled'],
    'payment_pending': ['paid'],
    'paid': ['finished'],
    'finished': [],
    'cancelled': []
};

/**
 * Validate if a status transition is allowed
 */
const isValidTransition = (currentStatus, newStatus, transitionMap) => {
    if (!currentStatus) return true; // Allow setting initial status
    const allowedTransitions = transitionMap[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
};

/**
 * Handle auto-decline logic when job enters WORKING phase
 * All non-accepted applications should be declined
 */
const autoDeclineApplications = async (jobId, acceptedApplicationId) => {
    try {
        logger.info(`Auto-declining applications for job ${jobId}, except ${acceptedApplicationId}`);

        const result = await JobApplication.updateMany(
            {
                job: jobId,
                _id: { $ne: acceptedApplicationId },
                status: 'applied'
            },
            {
                $set: {
                    status: 'declined',
                    updatedAt: new Date()
                },
                $push: {
                    statusHistory: {
                        status: 'declined',
                        changedAt: new Date(),
                        note: 'Auto-declined: Work started with selected worker'
                    }
                }
            }
        );

        logger.info(`Auto-declined ${result.modifiedCount} applications`);
        return result.modifiedCount;
    } catch (error) {
        logger.error('Error auto-declining applications:', error);
        throw error;
    }
};

/**
 * Update worker wallet when payments are made
 */
const updateWorkerWallet = async (workerId, amount, jobId, description) => {
    try {
        logger.info(`Updating worker ${workerId} wallet: +${amount}`);

        const worker = await Worker.findById(workerId);
        if (!worker) {
            throw new Error('Worker not found');
        }

        // Update balance
        worker.balance += amount;

        // Add to earnings history
        worker.earnings.push({
            jobId: jobId,
            amount: amount,
            date: new Date(),
            description: description
        });

        await worker.save();
        logger.info(`Worker wallet updated. New balance: ${worker.balance}`);

        return worker;
    } catch (error) {
        logger.error('Error updating worker wallet:', error);
        throw error;
    }
};

/**
 * Middleware to validate job status transitions
 */
const validateJobStatusTransition = async (req, res, next) => {
    try {
        const { jobId } = req.params;
        const { status: newStatus } = req.body;

        if (!newStatus) {
            return next(); // No status change
        }

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        const currentStatus = job.status;

        if (!isValidTransition(currentStatus, newStatus, VALID_JOB_TRANSITIONS)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
                allowedTransitions: VALID_JOB_TRANSITIONS[currentStatus] || []
            });
        }

        // Attach job to request for use in route handler
        req.job = job;
        next();
    } catch (error) {
        logger.error('Error in validateJobStatusTransition:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating status transition',
            error: error.message
        });
    }
};

/**
 * Middleware to validate application status transitions
 */
const validateApplicationStatusTransition = async (req, res, next) => {
    try {
        const { applicationId } = req.params;
        const { status: newStatus } = req.body;

        if (!newStatus) {
            return next(); // No status change
        }

        const application = await JobApplication.findById(applicationId);
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        const currentStatus = application.status;

        if (!isValidTransition(currentStatus, newStatus, VALID_APPLICATION_TRANSITIONS)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
                allowedTransitions: VALID_APPLICATION_TRANSITIONS[currentStatus] || []
            });
        }

        // Attach application to request for use in route handler
        req.application = application;
        next();
    } catch (error) {
        logger.error('Error in validateApplicationStatusTransition:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating status transition',
            error: error.message
        });
    }
};

module.exports = {
    validateJobStatusTransition,
    validateApplicationStatusTransition,
    autoDeclineApplications,
    updateWorkerWallet,
    isValidTransition,
    VALID_JOB_TRANSITIONS,
    VALID_APPLICATION_TRANSITIONS
};
