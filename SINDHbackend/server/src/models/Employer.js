/**
 * @deprecated This model is deprecated. Use Firestore 'employers' collection instead.
 * MongoDB is currently used for shadow writes only and will be fully removed in Phase 4.
 */
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-testing';

const employerSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
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
  otp: {
    code: {
      type: String,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  name: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: false,
    default: 25,
    min: 18,
    max: 100
  },
  // Phase-1 workflow fields
  phase: {
    type: Number,
    default: 1,
    enum: [1, 2]
  },
  shaktiScore: {
    type: Number,
    default: 10,
    min: 0,
    max: 100
  },
  profileCompleteness: {
    type: Number,
    default: 10,
    min: 0,
    max: 100
  },
  termsAccepted: {
    type: Boolean,
    default: false
  },
  termsAcceptedAt: {
    type: Date
  },
  company: {
    name: {
      type: String,
      required: false,
      default: ''
    },
    type: {
      type: String,
      default: ''
    },
    industry: {
      type: [String],
      default: []
    },
    primaryIndustry: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    registrationNumber: {
      type: String,
      default: ''
    }
  },
  location: {
    village: String,
    district: String,
    state: String,
    pincode: String,
    address: String,
    // GPS coordinates - ONLY included when GPS location is captured
    // If not provided, this field won't exist in the document at all
    coordinates: {
      type: { type: String, enum: ['Point'], required: false },
      coordinates: { type: [Number], required: false }
    }
  },
  businessDescription: String,
  workerType: {
    type: String,
    enum: ['Full-time workers', 'Part-time workers', 'Daily wage workers', 'Seasonal workers', 'Contract workers', 'Skilled craftsmen', 'General laborers'],
    default: 'Daily wage workers'
  },
  verificationDocuments: {
    aadharNumber: {
      type: String,
      required: true,
      default: 'not provided',
      validate: {
        validator: function (v) {
          if (v === 'not provided') return true;
          return /^\d{12}$/.test(v);
        },
        message: props => `${props.value} is not a valid Aadhar number! Must be 12 digits or 'not provided'.`
      }
    },
    panNumber: String,
    businessLicense: String
  },
  documents: [{
    type: String,
    url: String
  }],
  preferredLanguages: [String],
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
    }
  },
  reviews: [{
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker'
    },
    rating: Number,
    comment: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],

  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  isLoggedIn: {
    type: Number,
    default: 0
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  wallet: {
    totalBalance: {
      type: Number,
      default: 0
    },
    withdrawableBalance: {
      type: Number,
      default: 0
    },
    spentAmount: {
      type: Number,
      default: 0
    },
    transactionHistory: [{
      type: {
        type: String,
        enum: ['credit', 'debit', 'escrow_hold', 'escrow_release'],
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
    }],
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Virtual field for companyName (for easier access)
employerSchema.virtual('companyName').get(function () {
  return this.company?.name || this.name || '';
});

// Ensure virtuals are included in JSON
employerSchema.set('toJSON', { virtuals: true });
employerSchema.set('toObject', { virtuals: true });

// Create a 2dsphere index on location.coordinates for geospatial queries
employerSchema.index({ 'location.coordinates': '2dsphere' });

// Pre-save middleware to update timestamps and handle uniqueness
employerSchema.pre('save', async function (next) {
  this.updatedAt = Date.now();

  // Calculate profile completeness based on filled fields
  let completeness = 10; // Base: phone + name + location (Phase-1)

  if (this.email && this.email !== '') completeness += 5;
  if (this.age && this.age !== 25) completeness += 5; // Not default value
  if (this.company?.name && this.company.name !== '') completeness += 10;
  if (this.businessDescription && this.businessDescription !== '') completeness += 10;
  if (this.verificationDocuments?.aadharNumber && this.verificationDocuments.aadharNumber !== 'not provided') completeness += 15;
  if (this.company?.registrationNumber && this.company.registrationNumber !== '') completeness += 10;
  if (this.verificationDocuments?.panNumber) completeness += 5;

  this.profileCompleteness = Math.min(completeness, 100);

  // Calculate ShaktiScore
  this.shaktiScore = this.calculateShaktiScore();

  // Check for unique phone and aadhar (excluding 'not provided')
  const queryConditions = [{ phone: this.phone }];
  if (this.verificationDocuments?.aadharNumber && this.verificationDocuments.aadharNumber !== 'not provided') {
    queryConditions.push({ 'verificationDocuments.aadharNumber': this.verificationDocuments.aadharNumber });
  }

  const existingEmployer = await this.constructor.findOne({
    $or: queryConditions,
    _id: { $ne: this._id }
  });

  if (existingEmployer) {
    if (existingEmployer.phone === this.phone) {
      throw new Error('Phone number already registered');
    }
    if (existingEmployer.verificationDocuments?.aadharNumber === this.verificationDocuments?.aadharNumber &&
      this.verificationDocuments?.aadharNumber !== 'not provided') {
      throw new Error('Aadhar number already registered');
    }
  }

  next();
});

// Calculate ShaktiScore based on profile completion and verification
employerSchema.methods.calculateShaktiScore = function () {
  let score = 0;

  // Phone verified (OTP verified): +5 points
  if (this.phone) score += 5;

  // Profile created (Phase-1 baseline): +5 points
  score += 5;

  // Email added: +5 points
  if (this.email && this.email !== '') score += 5;

  // Aadhaar verified: +15 points
  if (this.verificationDocuments?.aadharNumber && this.verificationDocuments.aadharNumber !== 'not provided') {
    score += 15;
  }

  // Company registration: +10 points
  if (this.company?.registrationNumber && this.company.registrationNumber !== '') {
    score += 10;
  }

  // Business description: +5 points
  if (this.businessDescription && this.businessDescription !== '') {
    score += 5;
  }

  // PAN number: +5 points
  if (this.verificationDocuments?.panNumber) {
    score += 5;
  }

  // Good rating average (>= 4.0): +10 points
  if (this.rating?.average >= 4.0 && this.rating?.count >= 5) {
    score += 10;
  }

  return Math.min(score, 100);
};

// OTP methods
employerSchema.methods.generateOTP = async function () {
  const employer = this;
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Set OTP and expiry (5 minutes from now)
  employer.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
  };

  await employer.save();
  return otp;
};

employerSchema.methods.verifyOTP = async function (otpToVerify) {
  const employer = this;

  if (!employer.otp || !employer.otp.code || !employer.otp.expiresAt) {
    throw new Error('No OTP found');
  }

  if (Date.now() > employer.otp.expiresAt) {
    // Clear expired OTP
    employer.otp = { code: null, expiresAt: null };
    await employer.save();
    throw new Error('OTP has expired');
  }

  // Allow test OTP "0000" always for easier testing
  const isTestOtp = otpToVerify === '0000';

  console.log(`Debug verifyOTP: Input=${otpToVerify}, Stored=${employer.otp.code}, isTest=${isTestOtp}`);

  if (employer.otp.code !== otpToVerify && !isTestOtp) {
    throw new Error(`Invalid OTP. Input: ${otpToVerify}, Expected: ${employer.otp.code}`);
  }

  // Clear used OTP
  employer.otp = { code: null, expiresAt: null };
  await employer.save();
  return true;
};

employerSchema.methods.generateAuthToken = async function () {
  const employer = this;
  const token = jwt.sign(
    { _id: employer._id.toString(), role: 'employer' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  return token;
};

// Remove sensitive data from JSON responses
employerSchema.methods.toJSON = function () {
  const employer = this;
  const employerObject = employer.toObject();
  delete employerObject.otp;
  return employerObject;
};

const Employer = mongoose.model('Employer', employerSchema);

module.exports = Employer;