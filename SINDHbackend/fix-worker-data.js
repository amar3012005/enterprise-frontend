const mongoose = require('mongoose');
const Worker = require('./server/src/models/Worker');
const JobApplication = require('./server/src/models/JobApplication');
const Job = require('./server/src/models/Job');

async function fixWorkerData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sindh');
    console.log('Connected to MongoDB');
    
    // Find the problematic application
    const problematicApp = await JobApplication.findById('686643c6e94fe0e7c6214b3a')
      .populate('job');
    
    if (problematicApp) {
      console.log('Found problematic application:', {
        id: problematicApp._id,
        currentWorker: problematicApp.worker,
        employer: problematicApp.employer,
        status: problematicApp.status,
        paymentStatus: problematicApp.paymentStatus,
        paymentAmount: problematicApp.paymentAmount
      });
      
      // Find the correct worker (should be different from employer)
      const workers = await Worker.find({});
      console.log('\nAll workers in database:');
      workers.forEach(worker => {
        console.log(`- ${worker.name} (ID: ${worker._id})`);
      });
      
      // Find the correct worker (not the employer)
      const correctWorker = workers.find(w => 
        w._id.toString() !== problematicApp.employer.toString()
      );
      
      if (correctWorker) {
        console.log(`\nCorrect worker found: ${correctWorker.name} (${correctWorker._id})`);
        
        // Update the application with correct worker ID
        problematicApp.worker = correctWorker._id;
        await problematicApp.save();
        
        console.log('✅ Updated application with correct worker ID');
        
        // Now process the payment for the correct worker
        const paymentAmount = problematicApp.paymentAmount || problematicApp.job?.salary || 200;
        
        // Initialize worker fields if needed
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
        const existingEarning = correctWorker.earnings.find(e => 
          e.jobId && e.jobId.toString() === problematicApp.job._id.toString()
        );
        
        if (!existingEarning) {
          correctWorker.balance += paymentAmount;
          correctWorker.earnings.push({
            jobId: problematicApp.job._id,
            amount: paymentAmount,
            description: `Payment for: ${problematicApp.job.title}`,
            date: problematicApp.paymentDate || new Date()
          });
          
          await correctWorker.save();
          
          console.log(`💰 Added payment to correct worker: ${correctWorker.name} - ₹${correctWorker.balance}`);
        } else {
          console.log('Payment already exists for this worker');
        }
      } else {
        console.log('No correct worker found - all workers are employers?');
      }
    } else {
      console.log('Problematic application not found');
    }
    
    // Sync all worker balances
    console.log('\n=== Syncing all worker balances ===');
    
    for (const worker of workers) {
      const completedApps = await JobApplication.find({
        worker: worker._id,
        status: 'completed',
        paymentStatus: 'paid'
      }).populate('job');
      
      const totalEarned = completedApps.reduce((sum, app) => {
        return sum + (app.paymentAmount || app.job?.salary || 0);
      }, 0);
      
      const totalWithdrawn = (worker.withdrawals || []).reduce((sum, w) => sum + w.amount, 0);
      const correctBalance = totalEarned - totalWithdrawn;
      
      console.log(`Worker: ${worker.name}`);
      console.log(`  Completed jobs: ${completedApps.length}`);
      console.log(`  Total earned: ₹${totalEarned}`);
      console.log(`  Total withdrawn: ₹${totalWithdrawn}`);
      console.log(`  Current balance: ₹${worker.balance || 0}`);
      console.log(`  Correct balance: ₹${correctBalance}`);
      
      if (worker.balance !== correctBalance) {
        worker.balance = correctBalance;
        worker.earnings = completedApps.map(app => ({
          jobId: app.job._id,
          amount: app.paymentAmount || app.job?.salary || 0,
          description: `Payment for: ${app.job.title}`,
          date: app.paymentDate || app.updatedAt
        }));
        
        await worker.save();
        console.log(`  ✅ Updated balance to ₹${correctBalance}`);
      } else {
        console.log(`  ✅ Balance is correct`);
      }
      console.log('');
    }
    
    console.log('✅ All worker data fixed!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixWorkerData();
