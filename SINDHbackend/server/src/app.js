const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const workerRoutes = require('./routes/workerRoutes');
const employerRoutes = require('./routes/employerRoutes');
const jobRoutes = require('./routes/jobRoutes');
const jobApplicationRoutes = require('./routes/jobApplicationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Device Recognition Middleware
app.use((req, res, next) => {
  const deviceId = req.headers['x-device-id'];
  const appVersion = req.headers['x-app-version'];
  const platform = req.headers['x-platform'];

  if (deviceId) {
    // Log device info (in production this would be stored/updated in DB)
    console.log(`📱 Device Connected: ID=${deviceId}, Platform=${platform}, Version=${appVersion}`);
    
    // Attach device info to request object for downstream controllers
    req.device = {
      id: deviceId,
      version: appVersion,
      platform: platform
    };
  }
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Dynamic CORS configuration based on environment
const getCorsOrigins = () => {
  const origins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:8080', // For Capacitor development
    'capacitor://localhost', // For Capacitor iOS
    'ionic://localhost', // For Capacitor Android
    'http://10.0.2.2:3000', // Android Emulator localhost
    'http://10.0.2.2:3001',
    'http://10.0.2.2:5173',
    'http://10.0.2.2:8080',
    'http://10.0.3.2:3000', // Genymotion Emulator localhost
    'http://10.0.3.2:3001',
    'http://10.0.3.2:5173',
    'http://10.0.3.2:8080',
    'https://sindhx1.vercel.app' // Always allow new Vercel deployment
  ];
  
  // Add production origins
  if (process.env.NODE_ENV === 'production') {
    origins.push(
      'https://splendid-travesseiro-45ebea.netlify.app',
      'https://sindh-frontend.netlify.app',
      'https://sindh-app.netlify.app',
      'https://sindhx1.vercel.app'
    );
  }
  
  // Add custom origins from environment variables
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(','));
  }
  
  return origins;
};

// Enhanced CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = getCorsOrigins();
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'User-Type', 'User-ID', 'X-Device-Id', 'X-App-Version', 'X-App-Build', 'X-Platform'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Add a health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    corsOrigins: getCorsOrigins()
  });
});

// Add a root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'SINDH Backend API',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      health: '/health',
      api: '/api',
      docs: '/api-docs'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api/workers', workerRoutes);
app.use('/api/employers', employerRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/job-applications', jobApplicationRoutes);
app.use('/api/notifications', notificationRoutes);

const { errorHandler } = require('./middleware/errorHandler');

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Allowed CORS origins:`, getCorsOrigins());
});
