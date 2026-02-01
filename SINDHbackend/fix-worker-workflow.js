const mongoose = require('mongoose');
const Worker = require('./server/src/models/Worker');
const JobApplication = require('./server/src/models/JobApplication');
const Job = require('./server/src/models/Job');
const Employer = require('./server/src/models/Employer');

async function fixWorkerWorkflow() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sindh');
    console.log('Connected to MongoDB');
    
    // Find the problematic application
    const problematicApp = await JobApplication.findById('686643c6e94fe0e7c6214b3a')
      .populate('job');
    
    if (!problematicApp) {
      console.log('❌ Application not found');
      return;
    }
    
    console.log('Found problematic application:', {
      id: problematicApp._id,
      currentWorkerID: problematicApp.worker,
      employerID: problematicApp.employer,
      status: problematicApp.status,
      paymentStatus: problematicApp.paymentStatus,
      paymentAmount: problematicApp.paymentAmount,
      workerName: problematicApp.workerDetails?.name
    });
    
    // Find all workers and employers to identify the correct worker
    const allWorkers = await Worker.find({});
    const allEmployers = await Employer.find({});
    
    console.log('\nAll workers:');
    allWorkers.forEach(worker => {
      console.log(`- ${worker.name} (ID: ${worker._id}, Phone: ${worker.phone})`);
    });
    
    console.log('\nAll employers:');
    allEmployers.forEach(employer => {
      console.log(`- ${employer.name || employer.companyName} (ID: ${employer._id}, Phone: ${employer.phone})`);
    });
    
    // Find the correct worker based on phone number from worker details
    const workerPhone = problematicApp.workerDetails?.phone;
    let correctWorker = null;
    
    if (workerPhone) {
      correctWorker = allWorkers.find(w => w.phone === workerPhone);
    }
    
    // If not found by phone, try by name pattern
    if (!correctWorker) {
      const workerName = problematicApp.workerDetails?.name;
      if (workerName) {
        // Extract the actual name (remove "- Employer" suffix)
        const cleanName = workerName.replace(' - Employer', '').trim();
        correctWorker = allWorkers.find(w => 
          w.name.toLowerCase().includes(cleanName.toLowerCase()) ||
          cleanName.toLowerCase().includes(w.name.toLowerCase())
        );
      }
    }
    
    // If still not found, pick the first worker that's not the employer
    if (!correctWorker) {
      correctWorker = allWorkers.find(w => 
        w._id.toString() !== problematicApp.employer.toString()
      );
    }
    
    if (!correctWorker) {
      console.log('❌ Could not find a suitable worker');
      return;
    }
    
    console.log(`\n✅ Found correct worker: ${correctWorker.name} (${correctWorker._id})`);
    
    // Update the application with correct worker ID
    console.log('\n🔧 Updating application...');
    
    problematicApp.worker = correctWorker._id;
    problematicApp.workerDetails.name = correctWorker.name; // Fix the name
    
    // Add proper status history for completed status
    const hasCompletedStatus = problematicApp.statusHistory.some(h => h.status === 'completed');
    if (!hasCompletedStatus) {
      problematicApp.statusHistory.push({
        status: 'completed',
        changedAt: problematicApp.updatedAt || new Date(),
        note: 'Job marked as completed'
      });
    }
    
    await problematicApp.save();
    console.log('✅ Application updated successfully');
    
    // Update worker balance and earnings
    console.log('\n💰 Processing worker payment...');
    
    // Initialize worker fields
    if (typeof correctWorker.balance !== 'number') {
      correctWorker.balance = 0;
    }
    if (!Array.isArray(correctWorker.earnings)) {
      correctWorker.earnings = [];
    }
    if (!Array.isArray(correctWorker.withdrawals)) {
      correctWorker.withdrawals = [];
    }
    
    // Check if this payment already exists
    const existingEarning = correctWorker.earnings.find(earning => 
      earning.jobId && earning.jobId.toString() === problematicApp.job._id.toString()
    );
    
    if (!existingEarning) {
      const paymentAmount = problematicApp.paymentAmount || 200;
      
      // Add to balance
      correctWorker.balance += paymentAmount;
      
      // Add to earnings
      correctWorker.earnings.push({
        jobId: problematicApp.job._id,
        amount: paymentAmount,
        description: `Payment for: ${problematicApp.job.title}`,
        date: problematicApp.paymentDate || new Date()
      });
      
      console.log(`✅ Added ₹${paymentAmount} to worker balance`);
    } else {
      console.log('Payment already exists in worker earnings');
    }
    
    // Recalculate total balance from all completed applications
    const allWorkerApplications = await JobApplication.find({
      worker: correctWorker._id,
      status: 'completed',
      paymentStatus: 'paid'
    }).populate('job');
    
    const totalEarned = allWorkerApplications.reduce((sum, app) => {
      return sum + (app.paymentAmount || app.job?.salary || 0);
    }, 0);
    
    const totalWithdrawn = correctWorker.withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const correctBalance = totalEarned - totalWithdrawn;
    
    // Update worker with correct balance
    correctWorker.balance = correctBalance;
    correctWorker.earnings = allWorkerApplications.map(app => ({
      jobId: app.job._id,
      amount: app.paymentAmount || app.job?.salary || 0,
      description: `Payment for: ${app.job.title}`,
      date: app.paymentDate || app.updatedAt
    }));
    
    await correctWorker.save();
    
    console.log(`\n✅ Worker workflow updated successfully!`);
    console.log('Final worker state:', {
      name: correctWorker.name,
      balance: correctWorker.balance,
      earningsCount: correctWorker.earnings.length,
      totalApplications: allWorkerApplications.length
    });
    
    // Update job statistics
    const jobStats = await JobApplication.aggregate([
      { $match: { worker: correctWorker._id } },
      { 
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('\nJob application statistics for worker:');
    jobStats.forEach(stat => {
      console.log(`- ${stat._id}: ${stat.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixWorkerWorkflow();
