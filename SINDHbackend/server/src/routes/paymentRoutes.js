const express = require('express');
const router = express.Router();
const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const NotificationService = require('../services/notificationService');
const logger = require('../config/logger');
const {
    AppError,
    ValidationError,
    NotFoundError,
    AuthenticationError,
    asyncHandler
} = require('../middleware/errorHandler');
const {
    autoDeclineApplications,
    updateWorkerWallet
} = require('../middleware/statusTransitionMiddleware');

/**
 * Payment Routes for Two-Stage Payment System
 * These routes handle the new payment workflow:
 * 1. Accept worker with BASE AMOUNT payment
 * 2. Mark work as done
 * 3. Confirm payment with ADDITIONAL CHARGES
 */

/**
 * Accept worker application and process BASE AMOUNT payment
 * POST /api/payments/accept/:applicationId
 */
router.post('/accept/:applicationId', asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const { baseAmount, employerId } = req.body;

    logger.info(`💰 Accepting application ${applicationId} with base amount: ₹${baseAmount}`);

    // Get application with populated data
    const application = await JobApplication.findById(applicationId)
        .populate('job')
        .populate('worker');

    if (!application) {
        throw new NotFoundError('Application not found');
    }

    if (application.status !== 'applied') {
        throw new ValidationError(`Cannot accept application in status: ${application.status}`);
    }

    const job = await Job.findById(application.job._id);
    if (!job) {
        throw new NotFoundError('Job not found');
    }

    // Verify employer authorization
    if (job.employer.toString() !== employerId) {
        throw new AuthenticationError('Unauthorized: You are not the employer for this job');
    }

    // Update application status
    application.status = 'accepted';
    application.acceptedAt = new Date();
    application.baseAmount = baseAmount;
    application.baseAmountPaid = true;
    application.statusHistory.push({
        status: 'accepted',
        changedAt: new Date(),
        note: `Employer accepted worker. Base amount: ₹${baseAmount}`
    });

    await application.save();

    // Update job status and payment info
    job.status = 'accepted';
    job.selectedWorker = application.worker._id;
    job.baseAmount = baseAmount;
    job.baseAmountPaidAt = new Date();

    await job.save();

    // Update worker wallet (virtual credit)
    await updateWorkerWallet(
        application.worker._id,
        baseAmount,
        job._id,
        `Base amount for job: ${job.title}`
    );

    logger.info(`✅ Application accepted successfully. Worker wallet updated with ₹${baseAmount}`);

    // Send notification to worker
    try {
        if (NotificationService.notifyApplicationAccepted) {
            await NotificationService.notifyApplicationAccepted(application, job, application.worker);
        }
    } catch (notificationError) {
        logger.error('Error sending acceptance notification:', notificationError);
    }

    res.json({
        success: true,
        message: 'Worker accepted and base amount paid successfully',
        data: {
            application,
            job: {
                _id: job._id,
                status: job.status,
                selectedWorker: job.selectedWorker
            },
            payment: {
                baseAmount,
                paidAt: new Date()
            }
        }
    });
}));

/**
 * Start work (transitions to WORKING status and auto-declines other applications)
 * POST /api/payments/start-work/:applicationId
 */
router.post('/start-work/:applicationId', asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const { workStartDate } = req.body;

    logger.info(`🚀 Starting work for application ${applicationId}`);

    const application = await JobApplication.findById(applicationId)
        .populate('job')
        .populate('worker');

    if (!application) {
        throw new NotFoundError('Application not found');
    }

    if (application.status !== 'accepted') {
        throw new ValidationError(`Cannot start work from status: ${application.status}`);
    }

    // Update application status
    application.status = 'working';
    application.startedAt = workStartDate || new Date();
    application.statusHistory.push({
        status: 'working',
        changedAt: new Date(),
        note: 'Work started'
    });

    await application.save();

    // Update job status
    const job = await Job.findById(application.job._id);
    job.status = 'working';
    job.workStartDate = workStartDate || new Date();
    await job.save();

    // Auto-decline all other applications
    const declinedCount = await autoDeclineApplications(job._id, applicationId);

    logger.info(`✅ Work started. Auto-declined ${declinedCount} other applications.`);

    res.json({
        success: true,
        message: 'Work started successfully',
        data: {
            application,
            job: {
                _id: job._id,
                status: job.status,
                workStartDate: job.workStartDate
            },
            declinedApplications: declinedCount
        }
    });
}));

/**
 * Worker marks work as done
 * POST /api/payments/mark-done/:applicationId
 */
router.post('/mark-done/:applicationId', asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const { workerId } = req.body;

    logger.info(`✔️ Worker marking application ${applicationId} as done`);

    const application = await JobApplication.findById(applicationId)
        .populate('job')
        .populate('worker');

    if (!application) {
        throw new NotFoundError('Application not found');
    }

    // Verify worker authorization
    if (application.worker._id.toString() !== workerId) {
        throw new AuthenticationError('Unauthorized: You are not the worker for this application');
    }

    if (application.status !== 'working') {
        throw new ValidationError(`Cannot mark as done from status: ${application.status}`);
    }

    // Update application status
    application.status = 'payment_pending';
    application.jobCompletedDate = new Date();
    application.statusHistory.push({
        status: 'payment_pending',
        changedAt: new Date(),
        note: 'Worker marked work as completed'
    });

    await application.save();

    // Update job status
    const job = await Job.findById(application.job._id);
    job.status = 'payment_pending';
    job.completedAt = new Date();
    await job.save();

    logger.info(`✅ Work marked as done. Status: payment_pending`);

    // Send notification to employer
    try {
        const employer = await Employer.findById(job.employer);
        if (NotificationService.notifyWorkCompleted) {
            await NotificationService.notifyWorkCompleted(application, job, employer);
        }
    } catch (notificationError) {
        logger.error('Error sending work completion notification:', notificationError);
    }

    res.json({
        success: true,
        message: 'Work marked as done. Awaiting employer confirmation and payment.',
        data: {
            application,
            job: {
                _id: job._id,
                status: job.status,
                completedAt: job.completedAt
            }
        }
    });
}));

/**
 * Employer confirms work completion and pays ADDITIONAL CHARGES
 * POST /api/payments/confirm-payment/:applicationId
 */
router.post('/confirm-payment/:applicationId', asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const { additionalCharges, employerId } = req.body;

    logger.info(`💵 Employer confirming payment for application ${applicationId}. Additional charges: ₹${additionalCharges}`);

    const application = await JobApplication.findById(applicationId)
        .populate('job')
        .populate('worker');

    if (!application) {
        throw new NotFoundError('Application not found');
    }

    const job = await Job.findById(application.job._id);
    if (!job) {
        throw new NotFoundError('Job not found');
    }

    // Verify employer authorization
    if (job.employer.toString() !== employerId) {
        throw new AuthenticationError('Unauthorized: You are not the employer for this job');
    }

    if (application.status !== 'payment_pending') {
        throw new ValidationError(`Cannot confirm payment from status: ${application.status}`);
    }

    // Calculate total payment
    const totalPayment = application.baseAmount + additionalCharges;

    // Update application
    application.status = 'paid';
    application.additionalCharges = additionalCharges;
    application.totalPayment = totalPayment;
    application.additionalChargesPaid = true;
    application.paymentDate = new Date();
    application.statusHistory.push({
        status: 'paid',
        changedAt: new Date(),
        note: `Employer confirmed work and paid additional charges: ₹${additionalCharges}. Total: ₹${totalPayment}`
    });

    await application.save();

    // Update job
    job.status = 'paid';
    job.additionalCharges = additionalCharges;
    job.totalPayment = totalPayment;
    job.additionalChargesPaidAt = new Date();
    await job.save();

    // Update worker wallet with additional charges
    await updateWorkerWallet(
        application.worker._id,
        additionalCharges,
        job._id,
        `Additional charges for job: ${job.title}`
    );

    // Mark job as finished
    application.status = 'finished';
    job.status = 'finished';

    application.statusHistory.push({
        status: 'finished',
        changedAt: new Date(),
        note: 'Job completed successfully'
    });

    await application.save();
    await job.save();

    logger.info(`✅ Payment confirmed. Total payment: ₹${totalPayment}. Job finished.`);

    // Send notification to worker
    try {
        if (NotificationService.notifyPaymentReceived) {
            await NotificationService.notifyPaymentReceived(application, job, application.worker, totalPayment);
        }
    } catch (notificationError) {
        logger.error('Error sending payment notification:', notificationError);
    }

    res.json({
        success: true,
        message: 'Payment confirmed and job completed successfully',
        data: {
            application,
            job: {
                _id: job._id,
                status: job.status
            },
            payment: {
                baseAmount: application.baseAmount,
                additionalCharges,
                totalPayment,
                paidAt: new Date()
            }
        }
    });
}));

module.exports = router;
