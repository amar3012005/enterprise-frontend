const mongoose = require('mongoose');
const Worker = require('./server/src/models/Worker');
const JobApplication = require('./server/src/models/JobApplication');
const Job = require('./server/src/models/Job');

async function completePendingApplications() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sindh');
    console.log('Connected to MongoDB');
    
    // Find all pending applications
    const pendingApplications = await JobApplication.find({
      status: 'pending'
    }).populate('job').populate('worker');
    
    console.log(`Found ${pendingApplications.length} pending applications`);
    
    for (const application of pendingApplications) {
      if (!application.job || !application.worker) {
        console.log(`Skipping application ${application._id} - missing job or worker data`);
        continue;
      }
      
      console.log(`\nProcessing application for: ${application.worker.name}`);
      console.log(`Job: ${application.job.title}`);
      console.log(`Job Salary: ₹${application.job.salary}`);
      
      // Update application to completed and paid
      application.status = 'completed';
      application.paymentStatus = 'paid';
      application.paymentAmount = application.job.salary; // Set payment amount to job salary
      application.paymentDate = new Date();
      application.jobCompletedDate = new Date();
      
      await application.save();
      console.log(`✅ Application marked as completed and paid`);
      
      // Update job status to completed
      await Job.findByIdAndUpdate(application.job._id, {
        status: 'completed',
        completedAt: new Date()
      });
      
      console.log(`✅ Job marked as completed`);
      
      // Update worker balance
      const worker = await Worker.findById(application.worker._id);
      if (worker) {
        // Initialize balance and earnings if needed
        if (typeof worker.balance !== 'number') {
          worker.balance = 0;
        }
        if (!Array.isArray(worker.earnings)) {
          worker.earnings = [];
        }
        
        // Add to balance
        worker.balance += application.paymentAmount;
        
        // Add to earnings
        worker.earnings.push({
          jobId: application.job._id,
          amount: application.paymentAmount,
          description: `Payment for: ${application.job.title}`,
          date: new Date()
        });
        
        await worker.save();
        
        console.log(`✅ Worker balance updated: ${worker.name} - ₹${worker.balance}`);
      }
    }
    
    console.log('\n✅ All pending applications processed!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

completePendingApplications();
