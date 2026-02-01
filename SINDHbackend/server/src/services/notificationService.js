const { db, admin } = require('../config/firebase');
const mongoose = require('mongoose');

class NotificationService {
  constructor() {
    this.isDevelopment = true;
  }

  // Create in-app notification in Firestore
  async createInAppNotification(data) {
    try {
      const notificationData = {
        recipient: data.recipientId?.toString(),
        recipientModel: data.recipientModel,
        sender: data.senderId?.toString() || 'System',
        senderModel: data.senderModel || 'System',
        type: data.type,
        title: data.title,
        message: data.message,
        data: {
          jobId: data.jobId?.toString(),
          applicationId: data.applicationId?.toString(),
          employerId: data.employerId?.toString(),
          workerId: data.workerId?.toString()
        },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const targetId = (new mongoose.Types.ObjectId()).toString();
      await db.collection('notifications').doc(targetId).set(notificationData);
      
      console.log(`✅ In-app notification created in Firestore: ${data.type} for ${data.recipientModel}`);
      return { id: targetId, ...notificationData };
    } catch (error) {
      console.error('❌ Error creating in-app notification in Firestore:', error.message);
      return null;
    }
  }

  // Send SMS notification
  async sendSMS(to, message) {
    if (!to || !message) return { status: 'failed' };
    console.log(`\n[SMS to ${to}]: ${message}`);
    return { status: 'success', development: true };
  }

  // Notify about new application
  async notifyNewApplication(application, job, worker, employer) {
    try {
      // Notify Employer
      await this.createInAppNotification({
        recipientId: employer._id,
        recipientModel: 'Employer',
        type: 'new_application',
        title: 'New Job Application',
        message: `${worker.name} has applied for "${job.title}"`,
        jobId: job._id,
        applicationId: application._id,
        workerId: worker._id,
        employerId: employer._id
      });

      // Notify Worker
      await this.createInAppNotification({
        recipientId: worker._id,
        recipientModel: 'Worker',
        type: 'application_submitted',
        title: 'Application Submitted',
        message: `Your application for "${job.title}" has been received.`,
        jobId: job._id,
        applicationId: application._id,
        workerId: worker._id,
        employerId: employer._id
      });

      await this.sendSMS(employer.phone, `SINDH: New application from ${worker.name} for ${job.title}.`);
      return { success: true };
    } catch (error) {
      console.error('Error in notifyNewApplication:', error);
      return { success: false };
    }
  }

  // Notify Application Accepted
  async notifyApplicationAccepted(application, job, employer) {
    const workerId = application.worker._id || application.worker;
    const workerPhone = application.workerDetails?.phone;

    await this.createInAppNotification({
      recipientId: workerId,
      recipientModel: 'Worker',
      type: 'application_accepted',
      title: 'Congratulations!',
      message: `Your application for "${job.title}" has been accepted!`,
      jobId: job._id,
      applicationId: application._id,
      workerId: workerId,
      employerId: employer._id
    });

    if (workerPhone) {
      await this.sendSMS(workerPhone, `Congratulations! Your application for "${job.title}" has been accepted by ${employer.companyName || employer.name}. Check your app for details.`);
    }
  }

  // Notify Payment Success - notifies both employer and worker
  async notifyPaymentSuccess(application, job, employer, paymentAmount) {
    const workerId = application.worker._id || application.worker;
    const workerPhone = application.workerDetails?.phone || application.worker?.phone;
    const workerName = application.workerDetails?.name || application.worker?.name || 'Worker';
    const employerName = employer.companyName || employer.name || 'Employer';

    // Notify Worker
    await this.createInAppNotification({
      recipientId: workerId,
      recipientModel: 'Worker',
      type: 'payment_received',
      title: '🎉 You\'re Hired!',
      message: `${employerName} has paid ₹${paymentAmount} and accepted you for "${job.title}". Get ready to start working!`,
      jobId: job._id,
      applicationId: application._id,
      workerId: workerId,
      employerId: employer._id
    });

    // Notify Employer
    await this.createInAppNotification({
      recipientId: employer._id,
      recipientModel: 'Employer',
      type: 'payment_confirmed',
      title: '✅ Payment Successful',
      message: `You\'ve successfully paid ₹${paymentAmount} and hired ${workerName} for "${job.title}".`,
      jobId: job._id,
      applicationId: application._id,
      workerId: workerId,
      employerId: employer._id
    });

    // Send SMS to worker
    if (workerPhone) {
      await this.sendSMS(workerPhone, `🎉 Great news! ${employerName} has paid ₹${paymentAmount} and hired you for "${job.title}". Open SINDH app for details.`);
    }

    // Send SMS to employer
    if (employer.phone) {
      await this.sendSMS(employer.phone, `✅ Payment of ₹${paymentAmount} confirmed! ${workerName} is now hired for "${job.title}".`);
    }

    console.log(`✅ Payment success notifications sent for application ${application._id}`);
  }

  // Notify Application Rejected
  async notifyApplicationRejected(application, job, employer) {
    const workerId = application.worker._id || application.worker;
    await this.createInAppNotification({
      recipientId: workerId,
      recipientModel: 'Worker',
      type: 'application_rejected',
      title: 'Application Update',
      message: `Your application for "${job.title}" was not selected.`,
      jobId: job._id,
      applicationId: application._id,
      workerId: workerId,
      employerId: employer._id
    });
  }

  // Notify Job Started
  async notifyJobStarted(application, job, employer) {
    const workerId = application.worker._id || application.worker;
    await this.createInAppNotification({
      recipientId: workerId,
      recipientModel: 'Worker',
      type: 'job_started',
      title: 'Work Started',
      message: `Work has officially started for "${job.title}".`,
      jobId: job._id,
      applicationId: application._id,
      workerId: workerId,
      employerId: employer._id
    });
  }

  // Notify Job Completed
  async notifyJobCompleted(application, job, employer) {
    const workerId = application.worker._id || application.worker;
    await this.createInAppNotification({
      recipientId: workerId,
      recipientModel: 'Worker',
      type: 'job_completed',
      title: 'Work Completed',
      message: `Job "${job.title}" has been marked as completed.`,
      jobId: job._id,
      applicationId: application._id,
      workerId: workerId,
      employerId: employer._id
    });
  }

  // Notify Job Cancelled
  async notifyJobCancelled(application, job, employer) {
    const workerId = application.worker._id || application.worker;
    await this.createInAppNotification({
      recipientId: workerId,
      recipientModel: 'Worker',
      type: 'system',
      title: 'Job Cancelled',
      message: `The job "${job.title}" has been cancelled.`,
      jobId: job._id,
      applicationId: application._id,
      workerId: workerId,
      employerId: employer._id
    });
  }

  // Status update generic helper
  async notifyWorkerAboutStatus(worker, job, status) {
    if (status === 'accepted') return this.notifyApplicationAccepted({ worker, job }, job, { _id: job.employer });
    if (status === 'rejected') return this.notifyApplicationRejected({ worker, job }, job, { _id: job.employer });
  }
}

module.exports = new NotificationService();