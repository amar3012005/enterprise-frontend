/**
 * @deprecated This model is deprecated. Use Firestore 'workers' collection instead.
 * MongoDB is currently used for shadow writes only and will be fully removed in Phase 4.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-testing';

const workerSchema = new mongoose.Schema({
  // Personal Information (Step 1)
  name: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 18,
    max: 70
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (v) {
        // Accept both formats: +919876543210 or 9876543210
        return /^(\+91)?[6-9]\d{9}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
    validate: {
      validator: function (v) {
        // Allow empty string, null, or undefined (optional field)
        if (!v || v === '' || v.trim() === '') return true;
        // If value exists, validate email format
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please enter a valid email or leave empty'
    }
  },
  gender: {
    type: String,
    required: false,
    default: 'Male',
    enum: ['Male', 'Female', 'Other']
  },

  // Identity Verification (Step 2)
  aadharNumber: {
    type: String,
    required: false, // Phase-2 field
    default: null,
    validate: {
      validator: function (v) {
        // Allow null or 'not provided' for deferred verification
        if (v === null || v === 'not provided') return true;
        // If value is provided, validate 12-digit format
        return /^\d{12}$/.test(v);
      },
      message: props => `${props.value} is not a valid Aadhar number! Must be 12 digits, null, or 'not provided'.`
    }
  },

  // Skills & Experience (Step 3)
  skills: [{
    type: String,
    required: false
  }],
  experience: {
    type: String,
    required: false,
    default: 'Less than 1 year',
    enum: ['Less than 1 year', '1-2 years', '3-5 years', '6-10 years', 'More than 10 years']
  },
  preferredCategory: {
    type: String,
    required: true,
    enum: ['Construction', 'Agriculture', 'Household', 'Transportation', 'Manufacturing', 'Retail', 'Other']
  },
  expectedSalary: {
    type: String,
    required: true
  },

  // Languages (Step 4)
  languages: [{
    type: String,
    required: false
  }],

  // Location Details (Step 5)
  location: {
    address: {
      type: String,
      trim: true
    },
    village: {
      type: String,
      required: false,
      default: '',
      trim: true
    },
    district: {
      type: String,
      required: false,
      default: '',
      trim: true
    },
    state: {
      type: String,
      required: false,
      default: '',
      trim: true
    },
    pincode: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^\d{6}$/.test(v);
        },
        message: 'Pincode must be 6 digits'
      }
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    }
  },

  // Work Preferences (Step 6)
  preferredWorkType: {
    type: String,
    required: false,
    default: 'Full-time daily work',
    enum: ['Full-time daily work', 'Part-time work', 'Contract work', 'Seasonal work', 'Flexible hours']
  },
  availability: {
    type: String,
    required: false,
    default: 'Available immediately',
    enum: ['Available immediately', 'Available within a week', 'Available within a month', 'Seasonal availability']
  },
  workRadius: {
    type: Number,
    default: 10,
    min: 1,
    max: 100
  },
  bio: {
    type: String,
    maxlength: 500,
    trim: true
  },

  // System fields
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'application_ready'],
    default: 'pending'
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  shaktiScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    },
    reviews: [{
      employerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employer'
      },
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // Timestamps
  registrationDate: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isLoggedIn: {
    type: Number,
    default: 0
  },

  // Profile tracking
  profileCompletionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Phase tracking (Phase-1 = minimal, Phase-2 = complete)
  phase: {
    type: Number,
    required: true,
    default: 1,
    enum: [1, 2]
  },

  // FCM Push Notification Token
  fcmToken: {
    type: String,
    required: false,
    default: null
  },
  fcmTokenUpdatedAt: {
    type: Date,
    default: null
  },

  // Work tracking
  activeJobs: {
    type: Number,
    default: 0
  },
  completedJobs: {
    type: Number,
    default: 0
  },

  // Wallet/Earnings tracking
  wallet: {
    // The "Global Truth" displayed everywhere - includes pending base payments
    totalBalance: {
      type: Number,
      default: 0,
      description: 'Global Total Balance (Withdrawable + Pending)'
    },
    // The amount actually available for withdrawal (only completed jobs)
    withdrawableBalance: {
      type: Number,
      default: 0,
      description: 'Actually withdrawable amount'
    },
    // Legacy mapping (virtual)
    pendingBalance: {
      type: Number,
      default: 0,
      description: 'Legacy - mapped to totalBalance logic'
    },
    totalEarnings: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Total lifetime earnings'
    },
    withdrawnAmount: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Total amount withdrawn'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    transactionHistory: [{
      type: {
        type: String,
        enum: ['credit', 'debit', 'withdrawal', 'credit_pending'],
        required: true
      },
      amount: {
        type: Number,
        required: true
      },
      description: String,
      jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
      },
      applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobApplication'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  workHistory: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employer'
    },
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['ongoing', 'completed', 'cancelled']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String
  }],

  // Additional fields
  profilePicture: {
    type: String,
    default: ''
  },
  documents: [{
    type: {
      type: String,
      enum: ['aadhar', 'pan', 'license', 'certificate', 'other']
    },
    url: String,
    verified: {
      type: Boolean,
      default: false
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    accountHolderName: String
  },

  // Contact preferences
  emailNotifications: {
    type: Boolean,
    default: true
  },
  smsNotifications: {
    type: Boolean,
    default: true
  },

  // Emergency contact
  emergencyContact: {
    name: String,
    phone: String,
    relation: String
  },

  // OTP for verification
  otp: {
    code: String,
    expiresAt: Date
  },

  // Balance and earnings
  balance: {
    type: Number,
    default: 0
  },
  earnings: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    date: {
      type: Date,
      default: Date.now
    },
    description: {
      type: String,
      default: 'Job payment'
    }
  }],

  // Track all job applications
  jobApplications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobApplication'
  }]
}, {
  timestamps: true
});

// Indexes for better performance
workerSchema.index({ phone: 1 });
// Create a simple non-unique index for aadharNumber for query performance
// We will handle uniqueness in code during the pre-save hook
workerSchema.index(
  { aadharNumber: 1 },
  {
    name: 'aadharNumber_index',
    unique: false // Not enforcing uniqueness at the database level
  }
);
workerSchema.index({ 'location.state': 1, 'location.district': 1 });
workerSchema.index({ skills: 1 });
workerSchema.index({ preferredCategory: 1 });
workerSchema.index({ shaktiScore: -1 });
workerSchema.index({ 'location.coordinates': '2dsphere' });

// Pre-save middleware to calculate ShaktiScore and profile completion
workerSchema.pre('save', function (next) {
  console.log('\nCalculating ShaktiScore and profile completion for worker:', this.name);

  let score = 0;
  let completedFields = 0;
  const totalFields = 15; // Total number of profile fields to track

  // Phase-1 Baseline: 10 points for phone + profile creation
  if (this.phase === 1) {
    // Minimal scoring for Phase-1 workers
    score = 10; // Baseline for being registered

    // Count only Phase-1 required fields (6 out of 15 total)
    if (this.name) completedFields++;
    if (this.age && this.age >= 18) completedFields++;
    if (this.phone) completedFields++;
    if (this.location && this.location.pincode) completedFields++;
    if (this.preferredCategory) completedFields++;
    if (this.expectedSalary) completedFields++;

    // Phase-1 profile is 40% complete (6/15 fields)
    this.profileCompletionPercentage = Math.round((completedFields / totalFields) * 100);
  } else {
    // Phase-2: Full scoring system
    // Personal Information (25 points)
    if (this.name) { score += 5; completedFields++; }
    if (this.age && this.age >= 18) { score += 5; completedFields++; }
    if (this.phone) { score += 5; completedFields++; }
    if (this.email) { score += 3; completedFields++; }
    if (this.gender) { score += 3; completedFields++; }
    if (this.aadharNumber) { score += 4; completedFields++; }

    // Professional Information (30 points)
    if (this.skills && this.skills.length > 0) { score += 10; completedFields++; }
    if (this.skills && this.skills.length >= 3) score += 3; // Bonus for multiple skills
    if (this.experience) { score += 7; completedFields++; }
    if (this.preferredCategory) { score += 5; completedFields++; }
    if (this.expectedSalary) { score += 5; completedFields++; }

    // Communication (15 points)
    if (this.languages && this.languages.length > 0) { score += 8; completedFields++; }
    if (this.languages && this.languages.length >= 2) score += 4; // Bonus for multilingual
    if (this.languages && this.languages.includes('English')) score += 3; // English bonus

    // Location (10 points)
    if (this.location && this.location.village) { score += 3; completedFields++; }
    if (this.location && this.location.district) score += 3;
    if (this.location && this.location.state) score += 2;
    if (this.location && this.location.pincode) score += 2;

    // Work Preferences (10 points)
    if (this.availability) { score += 3; completedFields++; }
    if (this.preferredWorkType) { score += 3; completedFields++; }
    if (this.workRadius) score += 2;
    if (this.bio && this.bio.length > 50) { score += 2; completedFields++; }

    // Additional Information (5 points)
    if (this.documents && this.documents.length > 0) score += 3;
    if (this.emergencyContact && this.emergencyContact.name) score += 2;

    // Performance & Verification (5 points)
    if (this.verificationStatus === 'verified') score += 3;
    if (this.rating && this.rating.average > 0) score += 2;

    this.profileCompletionPercentage = Math.round((completedFields / totalFields) * 100);
  }

  this.shaktiScore = Math.min(score, 100); // Cap at 100

  console.log('Phase:', this.phase);
  console.log('Final ShaktiScore:', this.shaktiScore);
  console.log('Profile Completion:', this.profileCompletionPercentage, '%');

  next();
});

// Method to generate auth token
workerSchema.methods.generateAuthToken = async function () {
  console.log('\nGenerating auth token for worker:', this._id);
  const token = jwt.sign(
    { _id: this._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  console.log('Token generated successfully');
  return token;
};

// Validate phone and aadhar uniqueness
workerSchema.pre('save', async function (next) {
  console.log('\nChecking phone and aadhar uniqueness...');

  // Build query conditions
  const queryConditions = [{ phone: this.phone }];

  // Only check Aadhar uniqueness if it exists and is not null or 'not provided'
  if (this.aadharNumber && this.aadharNumber !== null && this.aadharNumber !== 'not provided') {
    queryConditions.push({ aadharNumber: this.aadharNumber });
  }

  const existingWorker = await this.constructor.findOne({
    $or: queryConditions,
    _id: { $ne: this._id }
  });

  if (existingWorker) {
    if (existingWorker.phone === this.phone) {
      console.error('Phone number already exists:', this.phone);
      throw new Error('Phone number already registered');
    }
    if (existingWorker.aadharNumber === this.aadharNumber &&
      this.aadharNumber !== null &&
      this.aadharNumber !== 'not provided') {
      console.error('Aadhar number already exists:', this.aadharNumber);
      throw new Error('Aadhar number already registered');
    }
  }

  console.log('Phone and Aadhar numbers are unique');
  next();
});

// OTP methods
workerSchema.methods.generateOTP = async function () {
  const worker = this;
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Set OTP and expiry (5 minutes from now)
  worker.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
  };

  await worker.save();
  return otp;
};

workerSchema.methods.verifyOTP = async function (otpToVerify) {
  const worker = this;

  if (!worker.otp || !worker.otp.code || !worker.otp.expiresAt) {
    throw new Error('No OTP found');
  }

  if (Date.now() > worker.otp.expiresAt) {
    // Clear expired OTP
    worker.otp = { code: null, expiresAt: null };
    await worker.save();
    throw new Error('OTP has expired');
  }

  // Allow test OTP "0000" in development
  const isTestOtp = otpToVerify === '0000' && process.env.NODE_ENV !== 'production';

  if (worker.otp.code !== otpToVerify && !isTestOtp) {
    throw new Error('Invalid OTP');
  }

  // Clear used OTP
  worker.otp = { code: null, expiresAt: null };
  await worker.save();
  return true;
};

// FCM Token Management
workerSchema.methods.updateFCMToken = async function (token) {
  const worker = this;
  worker.fcmToken = token;
  worker.fcmTokenUpdatedAt = new Date();
  await worker.save();
  console.log('FCM token updated for worker:', worker._id);
  return true;
};

workerSchema.methods.clearFCMToken = async function () {
  const worker = this;
  worker.fcmToken = null;
  worker.fcmTokenUpdatedAt = null;
  await worker.save();
  console.log('FCM token cleared for worker:', worker._id);
  return true;
};

// Remove sensitive data from JSON responses
workerSchema.methods.toJSON = function () {
  const worker = this;
  const workerObject = worker.toObject();
  delete workerObject.otp;
  delete workerObject.fcmToken; // Hide FCM token from API responses
  delete workerObject.fcmTokenUpdatedAt; // Hide timestamp
  return workerObject;
};

const Worker = mongoose.model('Worker', workerSchema);

// Utility to clean up all legacy aadharNumber indexes and create a non-unique index
async function ensureAadharIndexIntegrity() {
  try {
    const collection = mongoose.connection.collection('workers');
    const existing = await collection.indexes();

    // List of legacy index names to drop
    const legacyIndexNames = [
      'aadharNumber_1',
      'aadharNumber_unique_partial',
      'aadharNumber_unique_sparse'
    ];

    // Check if our desired non-unique index exists
    const hasDesired = existing.some(idx => idx.name === 'aadharNumber_index');

    // Drop ALL existing aadharNumber indexes
    for (const index of existing) {
      if (legacyIndexNames.includes(index.name) ||
        (index.key && index.key.aadharNumber !== undefined && index.name !== 'aadharNumber_index')) {
        try {
          console.log(`Dropping index: ${index.name}`);
          await collection.dropIndex(index.name);
        } catch (err) {
          console.log(`Error dropping index ${index.name}: ${err.message}`);
        }
      }
    }

    // Create simple non-unique index if it doesn't exist
    if (!hasDesired) {
      console.log('Creating non-unique index for aadharNumber');
      await collection.createIndex(
        { aadharNumber: 1 },
        { name: 'aadharNumber_index', unique: false }
      );
    }

    console.log('Aadhar index updated to non-unique');
  } catch (e) {
    console.error('Error handling aadharNumber index:', e.message);
  }
}

// Expose helper for startup
Worker.ensureIndexes = ensureAadharIndexIntegrity;

module.exports = Worker;