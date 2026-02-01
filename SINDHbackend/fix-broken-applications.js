const mongoose = require('mongoose');
const JobApplication = require('./server/src/models/JobApplication');
const Job = require('./server/src/models/Job');
const Worker = require('./server/src/models/Worker');

async function fixBrokenApplications() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sindh');
    console.log('Connected to MongoDB');
    
    // Find all applications
    const applications = await JobApplication.find({});
    console.log(`Found ${applications.length} applications to check`);
    
    for (const app of applications) {
      console.log(`\nChecking application: ${app._id}`);
      
      let needsUpdate = false;
      
      // Check if job exists
      if (app.job) {
        const job = await Job.findById(app.job);
        if (!job) {
          console.log(`❌ Job ${app.job} not found for application ${app._id}`);
          // You might want to delete this application or handle differently
          continue;
        } else {
          console.log(`✅ Job found: ${job.title}`);
        }
      }
      
      // Check if worker exists
      if (app.worker) {
        const worker = await Worker.findById(app.worker);
        if (!worker) {
          console.log(`❌ Worker ${app.worker} not found for application ${app._id}`);
          continue;
        } else {
          console.log(`✅ Worker found: ${worker.name}`);
        }
      }
      
      // Fix payment status if completed but not paid
      if (app.status === 'completed' && app.paymentStatus !== 'paid') {
        console.log(`🔧 Fixing payment status for completed application ${app._id}`);
        
        const job = await Job.findById(app.job);
        const paymentAmount = app.paymentAmount || job?.salary || 300;
        
        app.paymentStatus = 'paid';
        app.paymentAmount = paymentAmount;
        app.paymentDate = app.paymentDate || new Date();
        
        needsUpdate = true;
        
        // Update worker balance
        const worker = await Worker.findById(app.worker);
        if (worker) {
          if (typeof worker.balance !== 'number') {
            worker.balance = 0;
          }
          if (!Array.isArray(worker.earnings)) {
            worker.earnings = [];
          }
          
          // Check if this payment already exists in earnings
          const existingEarning = worker.earnings.find(earning => 
            earning.jobId && earning.jobId.toString() === app.job.toString()
          );
          
          if (!existingEarning) {
            worker.balance += paymentAmount;
            worker.earnings.push({
              jobId: app.job,
              amount: paymentAmount,
              description: `Payment for: ${job?.title || 'Job'}`,
              date: new Date()
            });
            
            await worker.save();
            console.log(`💰 Updated worker balance: ${worker.name} - ₹${worker.balance}`);
          }
        }
      }
      
      if (needsUpdate) {
        await app.save();
        console.log(`✅ Updated application ${app._id}`);
      }
    }
    
    console.log('\n✅ Finished checking all applications');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixBrokenApplications();
