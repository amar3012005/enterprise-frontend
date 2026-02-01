
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { db, admin } = require('../src/config/firebase');
const Worker = require('../src/models/Worker');
const Employer = require('../src/models/Employer');
const Job = require('../src/models/Job');
const JobApplication = require('../src/models/JobApplication');

// Helper function to recursively convert ObjectIds to strings and handle Date objects
function sanitizeForFirestore(obj) {
  if (obj === null || obj === undefined) return obj;

  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }

  // Handle Mongoose/MongoDB ObjectId
  if (obj._bsontype === 'ObjectID' || (obj.constructor && obj.constructor.name === 'ObjectId')) {
    return obj.toString();
  }

  // Handle Date objects (Firestore supports native Dates)
  if (obj instanceof Date) {
    return obj;
  }

  // Handle Objects
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip internal Mongoose fields
      if (key === '_v' || key === '__v') continue;
      sanitized[key] = sanitizeForFirestore(value);
    }
    return sanitized;
  }

  return obj;
}

async function migrateCollection(name, Model, firestoreCollection, transformFn) {
  console.log(`📦 Migrating ${name}...`);
  const documents = await Model.find({});
  console.log(`   Found ${documents.length} ${name} in MongoDB`);

  let batch = db.batch();
  let count = 0;
  let totalMigrated = 0;

  for (const doc of documents) {
    const data = doc.toObject();
    const id = data._id.toString();
    delete data._id;

    const sanitizedData = sanitizeForFirestore(data);
    const firestoreData = transformFn ? transformFn(id, sanitizedData) : sanitizedData;

    const docRef = db.collection(firestoreCollection).doc(id);
    batch.set(docRef, firestoreData, { merge: true });

    // Also manage legacy user mapping if it's a user type
    if (name === 'Workers' || name === 'Employers') {
      const userRef = db.collection('users').doc(id);
      batch.set(userRef, {
        phone: sanitizedData.phone,
        mongoId: id,
        type: name === 'Workers' ? 'worker' : 'employer',
        role: name === 'Workers' ? 'worker' : 'employer',
        migratedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      count++; // user mapping counts as an operation
    }

    count++;
    totalMigrated++;

    if (count >= 400) { // Commit before hitting 500 limit
      await batch.commit();
      console.log(`   Committed batch of writes... (${totalMigrated}/${documents.length})`);
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }
  console.log(`✅ Migrated ${totalMigrated} ${name}`);
}

async function migrate() {
  try {
    console.log('🚀 Starting Robust Migration from MongoDB to Firestore...');

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    if (!db) {
      throw new Error('Firestore not initialized. Check your serviceAccountKey.json');
    }

    const { admin } = require('../src/config/firebase');

    // 1. Migrate Workers
    await migrateCollection('Workers', Worker, 'workers', (id, data) => ({
      ...data,
      _id: id,
      id: id,
      type: 'worker',
      role: 'worker',
      migratedAt: new Date()
    }));

    // 2. Migrate Employers
    await migrateCollection('Employers', Employer, 'employers', (id, data) => ({
      ...data,
      _id: id,
      id: id,
      type: 'employer',
      role: 'employer',
      migratedAt: new Date()
    }));

    // 3. Migrate Jobs
    await migrateCollection('Jobs', Job, 'jobs', (id, data) => ({
      ...data,
      id: id,
      _id: id,
      createdAt: data.createdAt || new Date(),
      migratedAt: new Date()
    }));

    // 4. Migrate Applications
    await migrateCollection('Applications', JobApplication, 'applications', (id, data) => ({
      ...data,
      id: id,
      _id: id,
      appliedAt: data.createdAt || data.appliedAt || new Date(),
      migratedAt: new Date()
    }));

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

