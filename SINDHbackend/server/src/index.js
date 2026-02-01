require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { admin, db } = require('./config/firebase');
const workerRoutes = require('./routes/workerRoutes');
const Worker = require('./models/Worker');
const employerRoutes = require('./routes/employerRoutes');
const jobRoutes = require('./routes/jobRoutes');
const jobApplicationRoutes = require('./routes/jobApplicationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// Use Render's dynamic port or fallback to 10000 for local development
const PORT = process.env.PORT || 10000;

// Dynamic CORS configuration based on environment
const getCorsOrigins = () => {
  const origins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:8080',
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost', // Important for Android Capacitor
    'https://localhost' // For HTTPS local testing
  ];

  // Add Android Emulator IPs only in development
  if (process.env.NODE_ENV !== 'production') {
    origins.push(
      // Android Emulator special IPs (10.0.2.2 routes to host machine's localhost)
      'http://10.0.2.2:10000', // Backend port
      'http://10.0.2.2:3000',  // Frontend dev server
      'http://10.0.2.2:8080'   // Alternative port
    );
  }

  if (process.env.NODE_ENV === 'production') {
    origins.push(
      'https://splendid-travesseiro-45ebea.netlify.app',
      'https://sindh-frontend.netlify.app',
      'https://sindh-app.netlify.app'
    );
  }

  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(','));
  }

  return origins;
};

// Initialize server with database connection
const initializeServer = async () => {
  try {
    // Firebase is already initialized in ./config/firebase.js

    // CORS configuration - Allow frontend connections including mobile apps
    const corsOptions = {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl)
        if (!origin) {
          console.log('✅ CORS: Allowing request with no origin (mobile app)');
          return callback(null, true);
        }

        // Allow literal "null" origin (webviews, sandboxed iframes)
        if (origin === 'null') {
          console.log('✅ CORS: Allowing "null" origin (webview)');
          return callback(null, true);
        }

        // Check if origin is in allowed list
        const allowedOrigins = getCorsOrigins();
        if (allowedOrigins.includes(origin)) {
          console.log(`✅ CORS: Allowing origin: ${origin}`);
          return callback(null, true);
        }

        // Allow Capacitor/Cordova schemes
        if (origin.startsWith('capacitor://') || origin.startsWith('ionic://')) {
          console.log(`✅ CORS: Allowing Capacitor/Cordova origin: ${origin}`);
          return callback(null, true);
        }

        // Securely allow localhost origins by parsing URL
        try {
          const url = new URL(origin);
          if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            console.log(`✅ CORS: Allowing localhost origin: ${origin}`);
            return callback(null, true);
          }
        } catch (e) {
          // Invalid URL, will be rejected below
        }

        // Reject unknown origins
        console.warn(`❌ CORS: Rejecting origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'User-Type', 
        'User-ID',
        'X-Device-Id',
        'X-App-Version',
        'X-App-Build',
        'X-Platform',
        'x-device-id',
        'x-app-version',
        'x-app-build',
        'x-platform'
      ]
    };

    app.use(cors(corsOptions));

    // Explicitly handle OPTIONS preflight requests
    app.options('*', cors(corsOptions));

    // Middleware
    app.use(express.json());

    // Request logging middleware for debugging mobile connections
    // Only enable in development or when LOG_LEVEL is 'debug'
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'debug') {
      app.use((req, res, next) => {
        const timestamp = new Date().toISOString();
        const origin = req.headers.origin || 'no-origin';
        const userAgent = req.headers['user-agent'] || 'unknown';

        console.log(`📱 [${timestamp}] ${req.method} ${req.path}`);
        console.log(`   Origin: ${origin}`);
        console.log(`   User-Agent: ${userAgent.substring(0, 100)}`);

        // Detect mobile app requests
        const isMobileApp = !req.headers.origin ||
          req.headers.origin?.startsWith('capacitor://') ||
          req.headers.origin?.startsWith('ionic://') ||
          userAgent.includes('Capacitor');

        if (isMobileApp) {
          console.log('   🤖 Mobile app detected');
        }

        next();
      });
    }

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      const origin = req.headers.origin || 'no-origin';
      const isMobileApp = !req.headers.origin ||
        req.headers.origin?.startsWith('capacitor://') ||
        req.headers.origin?.startsWith('ionic://');

      // Check actual database connection state
      const isHealthy = db !== null;

      const responseData = {
        status: isHealthy ? 'ok' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: isHealthy ? 'connected' : 'disconnected',
          server: 'running'
        },
        environment: process.env.NODE_ENV || 'development',
        request: {
          origin: origin,
          isMobileApp: isMobileApp,
          userAgent: req.headers['user-agent']?.substring(0, 50)
        },
        cors: {
          allowedOrigins: getCorsOrigins(),
          acceptsNoOrigin: true,
          acceptsCapacitor: true
        }
      };

      // Return 500 if database is not connected
      if (!isHealthy) {
        return res.status(500).json(responseData);
      }

      res.status(200).json(responseData);
    });

    // Index ensure skipped for Firestore
    /*
    try {
      if (Worker && typeof Worker.ensureIndexes === 'function') {
        Worker.ensureIndexes();
      }
    } catch (e) {
      console.warn('Worker index ensure skipped:', e?.message);
    }
    */

    // CATCH-ALL REQUEST LOGGER - Debug employer registration
    app.use((req, res, next) => {
      console.log(`\n🔔 INCOMING REQUEST: ${req.method} ${req.url}`);
      console.log(`   Full Path: ${req.path}`);
      console.log(`   Origin: ${req.headers.origin || 'no-origin'}`);
      console.log(`   Content-Type: ${req.headers['content-type'] || 'none'}`);
      if (req.body && Object.keys(req.body).length > 0) {
        console.log(`   Body Keys: ${Object.keys(req.body).join(', ')}`);
      }
      next();
    });

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/workers', workerRoutes);
    app.use('/api/employers', employerRoutes);
    app.use('/api/jobs', jobRoutes);
    app.use('/api/job-applications', jobApplicationRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/payments', paymentRoutes);

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ message: 'Something went wrong!' });
    });

    // Bind to 0.0.0.0 to accept connections from any IP (required for Render)
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Allowed CORS origins:`, getCorsOrigins());

      if (process.env.NODE_ENV === 'production') {
        console.log(`📡 API available at http://localhost:10000/api`);
      } else {
        console.log(`📡 API available at http://localhost:${PORT}/api`);
        console.log(`🔗 Local development URL: http://localhost:${PORT}/api`);
      }

      console.log('🎉 Your service is live!');
    });

    // Index ensure already attempted above
  } catch (error) {
    console.error('❌ Server initialization failed:', error.message);
    process.exit(1);
  }
};

// Start server
initializeServer();