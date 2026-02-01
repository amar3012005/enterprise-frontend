
const { admin, db } = require('../src/config/firebase');

async function testFirebase() {
  try {
    console.log('Testing Firebase Admin connection...');
    if (!admin || !db) {
      console.error('❌ Firebase Admin or Firestore not initialized.');
      return;
    }

    console.log('✅ Firebase Admin initialized.');
    
    // Try to list collections (this will fail if service account is invalid, which is expected for now)
    const collections = await db.listCollections();
    console.log('✅ Successfully connected to Firestore. Collections count:', collections.length);
    
  } catch (error) {
    console.error('❌ Firebase Admin test failed:', error.message);
    if (error.message.includes('REPLACE_WITH_ACTUAL')) {
      console.log('💡 Note: This is expected as you need to provide a real serviceAccountKey.json');
    }
  }
}

testFirebase();






