const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Worker = require('./server/src/models/Worker');
const JobApplication = require('./server/src/models/JobApplication');
const Job = require('./server/src/models/Job');

async function processExistingCompletedJobs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/sindh', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Find all completed applications that haven't been paid
    const completedApplications = await JobApplication.find({
      status: 'completed',
      paymentStatus: { $in: ['pending', null, undefined] }
    }).populate('job').populate('worker');
    
    console.log(`Found ${completedApplications.length} completed jobs awaiting payment`);
    
    for (const application of completedApplications) {
      if (!application.job || !application.worker) {
        console.log(`Skipping application ${application._id} - missing job or worker data`);
        continue;
      }
      
      const worker = await Worker.findById(application.worker._id);
      if (!worker) {
        console.log(`Worker not found for application ${application._id}`);
        continue;
      }
      
      // Determine payment amount
      const paymentAmount = application.paymentAmount || application.job.salary || 15000;
      
      console.log(`Processing payment for worker: ${worker.name}`);
      console.log(`Job: ${application.job.title}`);
      console.log(`Amount: ₹${paymentAmount}`);
      
      // Initialize balance and earnings if they don't exist
      if (typeof worker.balance !== 'number') {
        worker.balance = 0;
      }
      if (!Array.isArray(worker.earnings)) {
        worker.earnings = [];
      }
      
      // Add to balance
      worker.balance += paymentAmount;
      
      // Add to earnings history
      worker.earnings.push({
        jobId: application.job._id,
        amount: paymentAmount,
        description: `Payment for: ${application.job.title}`,
        date: new Date()
      });
      
      await worker.save();
      
      // Update application payment status
      application.paymentStatus = 'paid';
      application.paymentAmount = paymentAmount;
      application.paymentDate = new Date();
      await application.save();
      
      console.log(`✅ Payment processed successfully!`);
      console.log(`   Worker balance: ₹${worker.balance}`);
      console.log(`   Earnings count: ${worker.earnings.length}`);
      console.log('---');
    }
    
    console.log('All completed jobs processed!');
    
  } catch (error) {
    console.error('Error processing payments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
processExistingCompletedJobs();
