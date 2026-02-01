require('dotenv').config();
const mongoose = require('mongoose');

async function fixAllInvalidCoordinates() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Strategy 1: Find ALL employers with coordinates field
    const allEmployers = await db.collection('employers').find({
      'location.coordinates': { $exists: true }
    }).toArray();

    console.log(`\n📊 Found ${allEmployers.length} employers with coordinates field\n`);

    let fixedCount = 0;

    for (const emp of allEmployers) {
      console.log(`\n🔍 Checking: ${emp.name} (${emp.phone})`);
      console.log('   Coordinates:', JSON.stringify(emp.location?.coordinates));

      const coords = emp.location?.coordinates;
      
      // Check if coordinates are invalid (missing array or empty array)
      const isInvalid = !coords?.coordinates || 
                       !Array.isArray(coords.coordinates) || 
                       coords.coordinates.length === 0;

      if (isInvalid) {
        console.log('   ⚠️ INVALID - Removing coordinates field');
        
        // Remove the invalid coordinates field
        await db.collection('employers').updateOne(
          { _id: emp._id },
          { $unset: { 'location.coordinates': '' } }
        );
        
        fixedCount++;
        console.log('   ✅ Fixed!');
      } else {
        console.log('   ✅ Valid coordinates');
      }
    }

    console.log(`\n\n📝 Summary:`);
    console.log(`   Total checked: ${allEmployers.length}`);
    console.log(`   Fixed: ${fixedCount}`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixAllInvalidCoordinates();
