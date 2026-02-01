require('dotenv').config();
const mongoose = require('mongoose');

async function checkCoordinates() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Find all employers and check their coordinates
    const employers = await db.collection('employers').find({}).toArray();
    
    console.log(`\n📊 Total employers: ${employers.length}\n`);
    
    employers.forEach((emp, index) => {
      console.log(`\n--- Employer ${index + 1}: ${emp.name} (${emp.phone}) ---`);
      console.log('Location:', JSON.stringify(emp.location, null, 2));
      
      if (emp.location?.coordinates) {
        const coords = emp.location.coordinates;
        console.log('Coordinates type:', coords.type);
        console.log('Coordinates array:', coords.coordinates);
        console.log('Array length:', coords.coordinates?.length);
        
        // Check if invalid
        if (!coords.coordinates || coords.coordinates.length === 0) {
          console.log('⚠️ INVALID: Empty coordinates array!');
        } else if (coords.coordinates.length === 2) {
          console.log('✅ VALID: Has proper [lng, lat]');
        }
      } else {
        console.log('ℹ️ No coordinates field (OK for pincode-only)');
      }
    });

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkCoordinates();
