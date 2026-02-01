const mongoose = require('mongoose');
const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');

// Cleanup script for corrupted job applications
async function cleanupJobApplications() {
  try {
    console.log('🔧 Starting JobApplication cleanup...');
    
    // Find all job applications
    const applications = await JobApplication.find({});
    console.log(`Found ${applications.length} applications to check`);
    
    let fixedCount = 0;
    let deletedCount = 0;
    
    for (const app of applications) {
      try {
        // Check if job field is corrupted (contains object string instead of ObjectId)
        if (app.job && typeof app.job === 'string' && !app.job.match(/^[0-9a-fA-F]{24}$/)) {
          console.log(`🔧 Fixing corrupted job reference in application ${app._id}`);
          
          // Try to extract ObjectId from the corrupted string
          const objectIdMatch = app.job.match(/ObjectId\("([0-9a-fA-F]{24})"\)/);
          
          if (objectIdMatch) {
            const jobId = objectIdMatch[1];
            
            // Verify the job exists
            const jobExists = await Job.findById(jobId);
            if (jobExists) {
              app.job = jobId;
              await app.save();
              fixedCount++;
              console.log(`✅ Fixed application ${app._id} -> job ${jobId}`);
            } else {
              console.log(`❌ Job ${jobId} doesn't exist, deleting application ${app._id}`);
              await JobApplication.findByIdAndDelete(app._id);
              deletedCount++;
            }
          } else {
            console.log(`❌ Cannot extract job ID from corrupted data, deleting application ${app._id}`);
            await JobApplication.findByIdAndDelete(app._id);
            deletedCount++;
          }
        }
        
        // Check if job reference is null
        else if (!app.job) {
          console.log(`❌ Application ${app._id} has null job reference, deleting`);
          await JobApplication.findByIdAndDelete(app._id);
          deletedCount++;
        }
        
        // Validate ObjectId format
        else if (app.job && !mongoose.Types.ObjectId.isValid(app.job)) {
          console.log(`❌ Application ${app._id} has invalid job ID format, deleting`);
          await JobApplication.findByIdAndDelete(app._id);
          deletedCount++;
        }
        
      } catch (error) {
        console.error(`Error processing application ${app._id}:`, error.message);
      }
    }
    
    console.log('\n✅ Cleanup completed!');
    console.log(`📊 Fixed: ${fixedCount} applications`);
    console.log(`🗑️ Deleted: ${deletedCount} corrupted applications`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

module.exports = { cleanupJobApplications };

// Run directly if called as script
if (require.main === module) {
  const mongoUrl = process.env.MONGODB_URI || 'mongodb+srv://amarsai2005:*****@sindh.illusfi.mongodb.net/';
  
  mongoose.connect(mongoUrl)
    .then(() => {
      console.log('📚 Connected to MongoDB');
      return cleanupJobApplications();
    })
    .then(() => {
      console.log('🎉 Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}
