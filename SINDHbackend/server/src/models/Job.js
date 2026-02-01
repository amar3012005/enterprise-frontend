/**
 * @deprecated This model is deprecated. Use Firestore 'jobs' collection instead.
 * MongoDB is currently used for shadow writes only and will be fully removed in Phase 4.
 */
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxLength: [200, 'Job title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true,
    maxLength: [2000, 'Job description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Job category is required'],
    enum: {
      values: ['Agriculture', 'Construction', 'Domestic', 'Household', 'Manufacturing', 'Transportation', 'Retail', 'Food Service', 'General', 'Cleaning', 'Hospitality', 'Security', 'Warehouse', 'General Labor'],
      message: 'Please select a valid category'
    }
  },
  salary: {
    type: Number,
    min: [0, 'Salary cannot be negative'],
    max: [1000000, 'Salary cannot exceed ₹1,000,000'],
    default: 0
  },
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employer',
    required: [true, 'Employer is required']
  },
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['onsite', 'remote', 'hybrid'],
      default: 'onsite'
    },
    street: String,
    village: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    pincode: {
      type: String,
      match: [/^\d{6}$/, 'Please provide a valid 6-digit pincode']
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          validator: function (coords) {
            // Validate array length
            if (!Array.isArray(coords) || coords.length !== 2) {
              return false;
            }

            const [lng, lat] = coords;

            // Validate that both are finite numbers
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
              return false;
            }

            // Validate longitude bounds (-180 to 180)
            if (lng < -180 || lng > 180) {
              return false;
            }

            // Validate latitude bounds (-90 to 90)
            if (lat < -90 || lat > 90) {
              return false;
            }

            return true;
          },
          message: 'Coordinates must be [longitude, latitude] where longitude is between -180 and 180, and latitude is between -90 and 90.'
        }
      }
    }
  },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Daily wage'],
    default: 'Full-time'
  },
  skillsRequired: [{
    type: String,
    trim: true
  }],
  requirements: {
    type: String,
    default: 'Basic requirements apply'
  },
  // Unified status system for job lifecycle
  status: {
    type: String,
    enum: ['POSTED', 'APPLIED', 'ACCEPTED', 'WORKING', 'PAYMENT_PENDING', 'PAID', 'FINISHED', 'COMPLETED', 'CANCELLED'],
    default: 'POSTED',
    description: 'Current status of the job in its lifecycle'
  },
  workerStatus: {
    type: String,
    default: 'active',
    description: 'Status as seen from the worker perspective'
  },
  employerStatus: {
    type: String,
    default: 'active',
    description: 'Status as seen from the employer perspective'
  },

  // Selected worker for this job
  selectedWorker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    default: null
  },

  // Work timeline
  workStartDate: {
    type: Date,
    description: 'Date when work actually starts (triggers auto-decline of other applications)'
  },

  // Payment tracking - Two-stage payment system
  baseAmount: {
    type: Number,
    required: [true, 'Base amount is required'],
    min: [0, 'Base amount cannot be negative'],
    description: 'Base amount paid when employer accepts a worker'
  },
  additionalCharges: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Additional charges paid when work is completed'
  },
  totalPayment: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Total payment (baseAmount + additionalCharges)'
  },
  baseAmountPaidAt: {
    type: Date,
    description: 'Timestamp when base amount was paid'
  },
  additionalChargesPaidAt: {
    type: Date,
    description: 'Timestamp when additional charges were paid'
  },

  urgency: {
    type: String,
    enum: ['Low', 'Normal', 'High', 'Urgent'],
    default: 'Normal'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  startTime: {
    type: String,
    description: 'Job start time (e.g., 09:00 AM)'
  },
  endTime: {
    type: String,
    description: 'Job end time (e.g., 06:00 PM)'
  },
  completedAt: Date,

  // Application tracking
  applicantCount: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Total number of workers who have applied'
  }
}, {
  timestamps: true
});

// Text search index
jobSchema.index({
  title: 'text',
  description: 'text',
  category: 'text'
});

// Geospatial index for location-based queries
jobSchema.index({ 'location.coordinates': '2dsphere' });

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;