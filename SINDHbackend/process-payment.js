const mongoose = require('mongoose');
const Worker = require('./server/src/models/Worker');
const JobApplication = require('./server/src/models/JobApplication');

async function processExistingPayment() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/sindh', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Find the completed application
    const applicationId = '68654bc7980ef335cddca142';
    const application = await JobApplication.findById(applicationId).populate('job');
    
    if (!application) {
      console.log('Application not found');
      return;
    }
    
    console.log('Found application:', application.status, application.paymentStatus);
    
    if (application.status === 'completed' && application.paymentStatus === 'pending') {
      const workerId = application.worker;
      const paymentAmount = application.job.salary || 15000; // Default amount
      
      console.log('Processing payment for worker:', workerId, 'Amount:', paymentAmount);
      
      const worker = await Worker.findById(workerId);
      if (!worker) {
        console.log('Worker not found');
        return;
      }
      
      // Initialize balance and earnings if they don't exist
      if (!worker.balance) worker.balance = 0;
      if (!worker.earnings) worker.earnings = [];
      
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
      
      console.log('Payment processed successfully!');
      console.log('Worker balance:', worker.balance);
      console.log('Earnings count:', worker.earnings.length);
    } else {
      console.log('Application not eligible for payment processing');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

processExistingPayment();
