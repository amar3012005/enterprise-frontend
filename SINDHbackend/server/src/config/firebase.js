
const admin = require('firebase-admin');
const path = require('path');

// Initialize with service account
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('📦 Using Firebase Service Account from environment variable');
  } else {
    serviceAccount = require('./serviceAccountKey.json');
    console.log('📂 Using Firebase Service Account from local file');
  }
} catch (error) {
  console.warn('⚠️ Firebase serviceAccountKey.json not found and FIREBASE_SERVICE_ACCOUNT env var not set!');
  console.warn('   Firebase Admin features will not work until credentials are provided.');
}

if (serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (initError) {
    console.error('❌ Firebase Admin SDK initialization failed:', initError.message);
  }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  admin.initializeApp();
  console.log('✅ Firebase Admin SDK initialized using GOOGLE_APPLICATION_CREDENTIALS');
}

const db = admin.apps.length > 0 ? admin.firestore() : null;

module.exports = { admin, db };

