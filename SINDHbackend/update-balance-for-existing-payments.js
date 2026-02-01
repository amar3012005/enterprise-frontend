const mongoose = require('mongoose');
const Worker = require('./server/src/models/Worker');
const JobApplication = require('./server/src/models/JobApplication');

async function updateBalanceForExistingPayments() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sindh');
    console.log('Connected to MongoDB');
    
    // Find the specific application that's already paid
    const paidApplication = await JobApplication.findById('686643c6e94fe0e7c6214b3a')
      .populate('job');
    
    if (!paidApplication) {
      console.log('Application not found');
      return;
    }
    
    console.log('Found paid application:', {
      id: paidApplication._id,
      workerPhone: paidApplication.workerDetails?.phone,
      status: paidApplication.status,
      paymentStatus: paidApplication.paymentStatus,
      paymentAmount: paidApplication.paymentAmount
    });
    
    // Find the correct worker by phone number
    const workerPhone = paidApplication.workerDetails?.phone;
    if (!workerPhone) {
      console.log('No phone number found in application');
      return;
    }
    
    const correctWorker = await Worker.findOne({ phone: workerPhone });
    if (!correctWorker) {
      console.log('No worker found with phone:', workerPhone);
      return;
    }
    
    console.log(`Found correct worker: ${correctWorker.name} (${correctWorker._id})`);
    console.log(`Current balance: ₹${correctWorker.balance || 0}`);
    
    // Update the application worker ID
    paidApplication.worker = correctWorker._id;
    paidApplication.workerDetails.name = correctWorker.name;
    await paidApplication.save();
    console.log('✅ Updated application worker ID');
    
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
    
    // Add payment to worker balance if not already added
    const paymentAmount = paidApplication.paymentAmount || 200;
    const existingEarning = correctWorker.earnings.find(e => 
      e.jobId && e.jobId.toString() === paidApplication.job._id.toString()
    );
    
    if (!existingEarning) {
      correctWorker.balance += paymentAmount;
      correctWorker.earnings.push({
        jobId: paidApplication.job._id,
        amount: paymentAmount,
        description: `Payment for: ${paidApplication.job.title}`,
        date: paidApplication.paymentDate || new Date()
      });
      
      await correctWorker.save();
      console.log(`✅ Added ₹${paymentAmount} to worker balance`);
      console.log(`New balance: ₹${correctWorker.balance}`);
    } else {
      console.log('Payment already exists in worker balance');
    }
    
    // Verify the update worked
    const updatedWorker = await Worker.findById(correctWorker._id);
    console.log(`\nFinal verification:`);
    console.log(`Worker: ${updatedWorker.name}`);
    console.log(`Balance: ₹${updatedWorker.balance}`);
    console.log(`Earnings: ${updatedWorker.earnings.length} entries`);
    
    // Test the past jobs API
    console.log('\n🧪 Testing past jobs API...');
    const completedJobs = await JobApplication.find({
      worker: correctWorker._id,
      status: 'completed'
    }).populate('job');
    
    console.log(`Past jobs found: ${completedJobs.length}`);
    completedJobs.forEach(job => {
      console.log(`- ${job.job?.title}: ₹${job.paymentAmount || job.job?.salary} (${job.paymentStatus})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

updateBalanceForExistingPayments();
