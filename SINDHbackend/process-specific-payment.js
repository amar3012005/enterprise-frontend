const mongoose = require('mongoose');
require('dotenv').config();

const Worker = require('./server/src/models/Worker');
const JobApplication = require('./server/src/models/JobApplication');

async function processSpecificPayment() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/sindh', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Find the specific completed application
    const applicationId = '68663b6779d684dbebb6a9cc';
    
    const application = await JobApplication.findById(applicationId)
      .populate('job')
      .populate('worker');
    
    if (!application) {
      console.log('Application not found');
      return;
    }
    
    console.log('Found application:', {
      id: application._id,
      status: application.status,
      paymentStatus: application.paymentStatus,
      paymentAmount: application.paymentAmount,
      jobTitle: application.job?.title,
      workerName: application.worker?.name || application.workerDetails?.name
    });
    
    if (application.status === 'completed' && application.paymentStatus === 'pending') {
      const workerId = application.worker._id || application.worker;
      const paymentAmount = application.job?.salary || 25000; // Use job salary or default
      
      console.log('Processing payment for worker:', workerId, 'Amount:', paymentAmount);
      
      const worker = await Worker.findById(workerId);
      if (!worker) {
        console.log('Worker not found');
        return;
      }
      
      console.log('Worker before update:', {
        name: worker.name,
        balance: worker.balance,
        earningsCount: worker.earnings?.length || 0
      });
      
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
      
      console.log('✅ Payment processed successfully!');
      console.log('Worker after update:', {
        name: worker.name,
        balance: worker.balance,
        earningsCount: worker.earnings.length
      });
      
    } else {
      console.log('Application not eligible for payment processing:', {
        status: application.status,
        paymentStatus: application.paymentStatus
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
processSpecificPayment();
