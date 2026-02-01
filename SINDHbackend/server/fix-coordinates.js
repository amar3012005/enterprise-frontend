require('dotenv').config();
const mongoose = require('mongoose');

async function fixInvalidCoordinates() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Find employers with empty coordinates array
    const employersWithEmptyCoords = await db.collection('employers').find({
      'location.coordinates': { $exists: true },
      'location.coordinates.coordinates': { $exists: true, $size: 0 }
    }).toArray();

    console.log(`📊 Found ${employersWithEmptyCoords.length} employers with invalid coordinates`);

    // Remove the invalid coordinates object
    const result = await db.collection('employers').updateMany(
      { 
        'location.coordinates': { $exists: true },
        'location.coordinates.coordinates': { $exists: true, $size: 0 }
      },
      { 
        $unset: { 'location.coordinates': '' } 
      }
    );

    console.log(`✅ Fixed ${result.modifiedCount} employer records`);
    console.log(`📝 Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing coordinates:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixInvalidCoordinates();
