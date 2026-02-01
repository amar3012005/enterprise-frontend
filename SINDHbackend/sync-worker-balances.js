const mongoose = require('mongoose');
require('dotenv').config();

const Worker = require('./server/src/models/Worker');
const JobApplication = require('./server/src/models/JobApplication');
const Job = require('./server/src/models/Job');
const Employer = require('./server/src/models/Employer');

async function syncWorkerBalances() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/sindh', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    console.log('Starting worker balance synchronization...\n');
    
    // Get all workers
    const workers = await Worker.find({});
    console.log(`Found ${workers.length} workers in database\n`);
    
    if (workers.length === 0) {
      console.log('No workers found in database');
      return;
    }
    
    // Check if we have any job applications at all
    const allApplications = await JobApplication.find({});
    console.log(`Total job applications in database: ${allApplications.length}`);
    
    if (allApplications.length === 0) {
      console.log('No job applications found in database');
      return;
    }
    
    // List all workers first
    console.log('Workers found:');
    workers.forEach((worker, index) => {
      console.log(`${index + 1}. ${worker.name} (ID: ${worker._id}) - Current Balance: ₹${worker.balance || 0}`);
    });
    console.log('');
    
    // Check applications for each worker
    for (const worker of workers) {
      console.log(`Processing worker: ${worker.name} (ID: ${worker._id})`);
      console.log(`Current balance: ₹${worker.balance || 0}`);
      
      // Find all applications for this worker (any status)
      const allWorkerApplications = await JobApplication.find({
        worker: worker._id
      });
      
      console.log(`Found ${allWorkerApplications.length} total applications for this worker`);
      
      if (allWorkerApplications.length === 0) {
        console.log('No applications found for this worker');
        console.log('---\n');
        continue;
      }
      
      // Log all applications for this worker
      for (let i = 0; i < allWorkerApplications.length; i++) {
        const app = allWorkerApplications[i];
        console.log(`  Application ${i + 1}:`);
        console.log(`    ID: ${app._id}`);
        console.log(`    Status: ${app.status}`);
        console.log(`    Payment Status: ${app.paymentStatus || 'not set'}`);
        console.log(`    Payment Amount: ₹${app.paymentAmount || 0}`);
        console.log(`    Job ID: ${app.job}`);
        
        // Try to populate job details
        try {
          const jobDetails = await Job.findById(app.job);
          if (jobDetails) {
            console.log(`    Job Title: ${jobDetails.title}`);
            console.log(`    Job Salary: ₹${jobDetails.salary || 0}`);
          } else {
            console.log(`    Job not found for ID: ${app.job}`);
          }
        } catch (jobError) {
          console.log(`    Error fetching job: ${jobError.message}`);
        }
      }
      
      // Find completed applications
      const completedApplications = allWorkerApplications.filter(app => app.status === 'completed');
      console.log(`  Found ${completedApplications.length} completed applications`);
      
      if (completedApplications.length === 0) {
        console.log('No completed jobs found for this worker');
        console.log('---\n');
        continue;
      }
      
      // Calculate total earnings
      let totalEarned = 0;
      const earningsArray = [];
      
      for (const app of completedApplications) {
        try {
          const jobDetails = await Job.findById(app.job);
          const amount = app.paymentAmount || jobDetails?.salary || 300; // Default to 300 if no amount
          
          console.log(`    Processing completed job: ${jobDetails?.title || 'Unknown'} - ₹${amount}`);
          
          totalEarned += amount;
          earningsArray.push({
            jobId: app.job,
            amount: amount,
            description: `Payment for: ${jobDetails?.title || 'Job'}`,
            date: app.paymentDate || app.updatedAt || new Date()
          });
          
          // Update the application if payment status is not set
          if (app.paymentStatus !== 'paid') {
            app.paymentStatus = 'paid';
            app.paymentAmount = amount;
            app.paymentDate = new Date();
            await app.save();
            console.log(`    Updated payment status for application ${app._id}`);
          }
          
        } catch (jobError) {
          console.log(`    Error processing job ${app.job}: ${jobError.message}`);
        }
      }
      
      console.log(`  Calculated Total Earnings: ₹${totalEarned}`);
      
      // Update worker balance and earnings
      const oldBalance = worker.balance || 0;
      worker.balance = totalEarned;
      worker.earnings = earningsArray;
      
      await worker.save();
      
      console.log(`  ✅ Updated worker balance from ₹${oldBalance} to ₹${worker.balance}`);
      console.log(`  ✅ Updated earnings count: ${worker.earnings.length}`);
      console.log('---\n');
    }
    
    console.log('✅ Worker balance synchronization completed!');
    
    // Summary
    const updatedWorkers = await Worker.find({});
    const totalBalance = updatedWorkers.reduce((sum, worker) => sum + (worker.balance || 0), 0);
    console.log(`\nSummary:`);
    console.log(`Total workers processed: ${workers.length}`);
    console.log(`Total balance across all workers: ₹${totalBalance}`);
    
  } catch (error) {
    console.error('❌ Error synchronizing worker balances:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the synchronization
syncWorkerBalances();
