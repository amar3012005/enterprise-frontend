const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');
const Worker = require('../models/Worker');
const Job = require('../models/Job');
const Employer = require('../models/Employer');
const {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  asyncHandler
} = require('../middleware/errorHandler');

// Send SMS notification
router.post('/sms', asyncHandler(async (req, res) => {
  const { to, message } = req.body;
  const response = await NotificationService.sendSMS(to, message);
  res.json(response);
}));

// Make a missed call
router.post('/missed-call', asyncHandler(async (req, res) => {
  const { to } = req.body;
  const response = await NotificationService.makeMissedCall(to);
  res.json(response);
}));

// Notify worker about new job
router.post('/worker/job-alert', asyncHandler(async (req, res) => {
  const { workerId, jobId } = req.body;

  const worker = await Worker.findById(workerId);
  if (!worker) {
    throw new NotFoundError('Worker not found');
  }

  const job = await Job.findById(jobId);
  if (!job) {
    throw new NotFoundError('Job not found');
  }

  await NotificationService.notifyWorkerAboutJob(worker, job);
  res.json({ message: 'Notification sent successfully' });
}));

// Notify employer about worker application
router.post('/employer/application-alert', asyncHandler(async (req, res) => {
  const { employerId, workerId, jobId } = req.body;

  const employer = await Employer.findById(employerId);
  if (!employer) {
    throw new NotFoundError('Employer not found');
  }

  const worker = await Worker.findById(workerId);
  if (!worker) {
    throw new NotFoundError('Worker not found');
  }

  const job = await Job.findById(jobId);
  if (!job) {
    throw new NotFoundError('Job not found');
  }

  await NotificationService.notifyEmployerAboutApplication(employer, worker, job);
  res.json({ message: 'Notification sent successfully' });
}));

// Notify worker about application status
router.post('/worker/status-update', asyncHandler(async (req, res) => {
  const { workerId, jobId, status } = req.body;

  const worker = await Worker.findById(workerId);
  if (!worker) {
    throw new NotFoundError('Worker not found');
  }

  const job = await Job.findById(jobId);
  if (!job) {
    throw new NotFoundError('Job not found');
  }

  await NotificationService.notifyWorkerAboutStatus(worker, job, status);
  res.json({ message: 'Status notification sent successfully' });
}));

// Send job reminder to worker
router.post('/worker/job-reminder', asyncHandler(async (req, res) => {
  const { workerId, jobId } = req.body;

  const worker = await Worker.findById(workerId);
  if (!worker) {
    throw new NotFoundError('Worker not found');
  }

  const job = await Job.findById(jobId);
  if (!job) {
    throw new NotFoundError('Job not found');
  }

  await NotificationService.sendJobReminder(worker, job);
  res.json({ message: 'Reminder sent successfully' });
}));

// Get notifications for user
router.get('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { userType = 'worker', limit = 20, page = 1 } = req.query;

  const result = await NotificationService.getNotifications(
    userId,
    userType,
    parseInt(limit),
    parseInt(page)
  );

  res.json({
    success: true,
    data: result.notifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: result.totalCount,
      unreadCount: result.unreadCount
    }
  });
}));

// Mark notification as read
router.patch('/:notificationId/read', asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const { userId } = req.body;

  const notification = await NotificationService.markAsRead(notificationId, userId);

  if (!notification) {
    throw new NotFoundError('Notification not found');
  }

  res.json({
    success: true,
    message: 'Notification marked as read',
    data: notification
  });
}));

// Mark all notifications as read
router.patch('/mark-all-read/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { userType = 'worker' } = req.body;

  await NotificationService.markAllAsRead(userId, userType);

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
}));

// Get unread count
router.get('/unread-count/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType = 'worker' } = req.query;

    const result = await NotificationService.getNotifications(userId, userType, 1);

    res.json({
      success: true,
      unreadCount: result.unreadCount
    });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    });
  }
});

module.exports = router;