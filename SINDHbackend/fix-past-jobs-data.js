const mongoose = require('mongoose');
const Worker = require('./server/src/models/Worker');
const JobApplication = require('./server/src/models/JobApplication');

async function fixPastJobsData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sindh');
    console.log('Connected to MongoDB');
    
    // Find the problematic application
    const problematicApp = await JobApplication.findById('686643c6e94fe0e7c6214b3a')
      .populate('job');
    
    if (!problematicApp) {
      console.log('Application not found');
      return;
    }
    
    console.log('Found application:', {
      id: problematicApp._id,
      currentWorker: problematicApp.worker,
      workerPhone: problematicApp.workerDetails?.phone,
      status: problematicApp.status,
      paymentStatus: problematicApp.paymentStatus
    });
    
    // Find the correct worker by phone number
    const workerPhone = problematicApp.workerDetails?.phone;
    if (workerPhone) {
      const correctWorker = await Worker.findOne({ phone: workerPhone });
      
      if (correctWorker) {
        console.log(`Found correct worker: ${correctWorker.name} (${correctWorker._id})`);
        
        // Update the application
        problematicApp.worker = correctWorker._id;
        problematicApp.workerDetails.name = correctWorker.name;
        await problematicApp.save();
        
        console.log('✅ Updated application worker ID');
        
        // Update worker balance if payment is processed but not reflected
        if (problematicApp.paymentStatus === 'paid') {
          const paymentAmount = problematicApp.paymentAmount || 200;
          
          // Initialize worker fields
          if (typeof correctWorker.balance !== 'number') {
            correctWorker.balance = 0;
          }
          if (!Array.isArray(correctWorker.earnings)) {
            correctWorker.earnings = [];
          }
          
          // Check if payment already exists
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
            console.log(`✅ Updated worker balance: ₹${correctWorker.balance}`);
          } else {
            console.log('Payment already exists in worker earnings');
          }
        }
        
        // Test the API endpoint
        console.log('\n🧪 Testing past jobs API...');
        const completedJobs = await JobApplication.find({
          worker: correctWorker._id,
          status: 'completed'
        }).populate('job');
        
        console.log(`Found ${completedJobs.length} completed jobs for worker ${correctWorker.name}`);
        
      } else {
        console.log('❌ Could not find worker by phone number');
      }
    } else {
      console.log('❌ No phone number in worker details');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixPastJobsData();
