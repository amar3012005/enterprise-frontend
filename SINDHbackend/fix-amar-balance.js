const mongoose = require('mongoose');
const Worker = require('./server/src/models/Worker');
const JobApplication = require('./server/src/models/JobApplication');

async function fixAmarBalance() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sindh');
    console.log('Connected to MongoDB');
    
    const workerId = '686635a9ac6144fe066f9c93';
    
    // Find Amar's completed applications
    const completedApps = await JobApplication.find({
      worker: workerId,
      status: 'completed'
    }).populate('job');
    
    console.log(`Found ${completedApps.length} completed applications`);
    
    // Update payment status for all completed jobs
    for (const app of completedApps) {
      if (app.paymentStatus !== 'paid') {
        app.paymentStatus = 'paid';
        app.paymentAmount = app.job?.salary || 300;
        app.paymentDate = new Date();
        await app.save();
        console.log(`Updated payment for job: ${app.job?.title} - ₹${app.paymentAmount}`);
      }
    }
    
    // Calculate total and update worker balance
    const totalEarned = completedApps.reduce((sum, app) => {
      return sum + (app.paymentAmount || app.job?.salary || 300);
    }, 0);
    
    const worker = await Worker.findById(workerId);
    worker.balance = totalEarned;
    worker.earnings = completedApps.map(app => ({
      jobId: app.job._id,
      amount: app.paymentAmount || app.job?.salary || 300,
      description: `Payment for: ${app.job?.title}`,
      date: new Date()
    }));
    
    await worker.save();
    
    console.log(`✅ Amar's balance updated to: ₹${worker.balance}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixAmarBalance();
