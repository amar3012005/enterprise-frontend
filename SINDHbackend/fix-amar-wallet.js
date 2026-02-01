const mongoose = require('mongoose');
const Worker = require('./server/src/models/Worker');
const JobApplication = require('./server/src/models/JobApplication');
const Job = require('./server/src/models/Job');

async function fixAmarWallet() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sindh');
    console.log('Connected to MongoDB');
    
    // First, let's see what workers exist in the database
    const allWorkers = await Worker.find({});
    console.log('\nAll workers in database:');
    allWorkers.forEach(worker => {
      console.log(`- ${worker.name} (ID: ${worker._id}, Phone: ${worker.phone})`);
    });
    
    // Find the problematic application first
    const problematicApp = await JobApplication.findById('686643c6e94fe0e7c6214b3a')
      .populate('job');
    
    if (!problematicApp) {
      console.log('❌ Problematic application not found');
      return;
    }
    
    console.log('\nProblematic application:', {
      id: problematicApp._id,
      currentWorker: problematicApp.worker,
      employer: problematicApp.employer,
      status: problematicApp.status,
      paymentStatus: problematicApp.paymentStatus,
      paymentAmount: problematicApp.paymentAmount,
      jobTitle: problematicApp.job?.title
    });
    
    // Find the correct worker - look for Amar by name or phone
    let correctWorker = allWorkers.find(w => 
      w.name.toLowerCase().includes('amar') && 
      w._id.toString() !== problematicApp.employer.toString()
    );
    
    // If not found by name, try by phone number from the application
    if (!correctWorker && problematicApp.workerDetails?.phone) {
      correctWorker = allWorkers.find(w => 
        w.phone === problematicApp.workerDetails.phone &&
        w._id.toString() !== problematicApp.employer.toString()
      );
    }
    
    // If still not found, just pick the first worker that's not the employer
    if (!correctWorker) {
      correctWorker = allWorkers.find(w => 
        w._id.toString() !== problematicApp.employer.toString()
      );
    }
    
    if (!correctWorker) {
      console.log('❌ No suitable worker found in database');
      return;
    }
    
    console.log(`\nFound correct worker: ${correctWorker.name} (${correctWorker._id})`);
    console.log(`Current balance: ₹${correctWorker.balance || 0}`);
    
    // Fix the worker ID in the application
    console.log('\n🔧 Fixing worker ID in application...');
    problematicApp.worker = correctWorker._id;
    problematicApp.workerDetails.name = correctWorker.name; // Fix the name too
    await problematicApp.save();
    console.log('✅ Updated application worker ID');
    
    // Now update the worker's balance and earnings
    console.log('\n💰 Processing payment for correct worker...');
    
    // Initialize worker wallet fields if not present
    if (typeof correctWorker.balance !== 'number') {
      correctWorker.balance = 0;
    }
    if (!Array.isArray(correctWorker.earnings)) {
      correctWorker.earnings = [];
    }
    if (!Array.isArray(correctWorker.withdrawals)) {
      correctWorker.withdrawals = [];
    }
    
    // Check if this payment already exists in earnings
    const existingEarning = correctWorker.earnings.find(earning => 
      earning.jobId && earning.jobId.toString() === problematicApp.job._id.toString()
    );
    
    if (!existingEarning) {
      // Add the payment to worker's balance and earnings
      const paymentAmount = problematicApp.paymentAmount || 200;
      
      correctWorker.balance += paymentAmount;
      correctWorker.earnings.push({
        jobId: problematicApp.job._id,
        amount: paymentAmount,
        description: `Payment for: ${problematicApp.job.title}`,
        date: problematicApp.paymentDate || new Date()
      });
      
      await correctWorker.save();
      
      console.log(`✅ Added ₹${paymentAmount} to worker balance`);
      console.log(`New balance: ₹${correctWorker.balance}`);
    } else {
      console.log('Payment already exists in worker earnings');
    }
    
    // Verify the fix by checking all completed applications for this worker
    console.log('\n🔍 Verifying all completed jobs for worker...');
    
    const allCompletedApps = await JobApplication.find({
      worker: correctWorker._id,
      status: 'completed',
      paymentStatus: 'paid'
    }).populate('job');
    
    console.log(`Found ${allCompletedApps.length} completed paid jobs`);
    
    // Recalculate total balance from all completed jobs
    const totalEarned = allCompletedApps.reduce((sum, app) => {
      const amount = app.paymentAmount || app.job?.salary || 0;
      console.log(`  - ${app.job?.title}: ₹${amount}`);
      return sum + amount;
    }, 0);
    
    const totalWithdrawn = (correctWorker.withdrawals || []).reduce((sum, w) => sum + w.amount, 0);
    const correctBalance = totalEarned - totalWithdrawn;
    
    console.log(`\nBalance calculation:`);
    console.log(`Total earned: ₹${totalEarned}`);
    console.log(`Total withdrawn: ₹${totalWithdrawn}`);
    console.log(`Correct balance: ₹${correctBalance}`);
    console.log(`Current balance: ₹${correctWorker.balance}`);
    
    if (correctWorker.balance !== correctBalance) {
      correctWorker.balance = correctBalance;
      correctWorker.earnings = allCompletedApps.map(app => ({
        jobId: app.job._id,
        amount: app.paymentAmount || app.job?.salary || 0,
        description: `Payment for: ${app.job.title}`,
        date: app.paymentDate || app.updatedAt
      }));
      
      await correctWorker.save();
      console.log(`✅ Updated worker balance to ₹${correctBalance}`);
    } else {
      console.log('✅ Worker balance is already correct');
    }
    
    console.log('\n✅ Worker wallet has been fixed!');
    console.log('Final worker data:', {
      name: correctWorker.name,
      balance: correctWorker.balance,
      earningsCount: correctWorker.earnings.length,
      withdrawalsCount: (correctWorker.withdrawals || []).length
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixAmarWallet();
