const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientModel'
  },
  recipientModel: {
    type: String,
    required: true,
    enum: ['Worker', 'Employer']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderModel'
  },
  senderModel: {
    type: String,
    enum: ['Worker', 'Employer', 'System']
  },
  type: {
    type: String,
    required: true,
    enum: [
      'application_accepted',
      'application_rejected',
      'application_submitted',
      'job_started',
      'job_completed',
      'new_application',
      'system',
      // Job workflow types
      'work_started',           // When work begins
      'work_finished_worker',   // Worker confirmed work is done
      'work_finished_employer', // Employer confirmed + paid additional
      'additional_payment'      // Additional charges paid
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobApplication'
    },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employer'
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker'
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better performance
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
