const mongoose = require('mongoose');
const Job = require('./server/src/models/Job');
const JobApplication = require('./server/src/models/JobApplication');
const Worker = require('./server/src/models/Worker');
const Employer = require('./server/src/models/Employer');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/sindh', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testJobApplications() {
  try {
    console.log('🧪 Testing job applications...');
    
    // Find a job
    const job = await Job.findOne({ status: 'active' });
    if (!job) {
      console.log('❌ No active jobs found');
      return;
    }
    console.log('📋 Found job:', { id: job._id, title: job.title, status: job.status });
    
    // Find a worker
    const worker = await Worker.findOne();
    if (!worker) {
      console.log('❌ No workers found');
      return;
    }
    console.log('👷 Found worker:', { id: worker._id, name: worker.name });
    
    // Check existing applications
    const existingApplications = await JobApplication.find({ 
      job: job._id, 
      worker: worker._id 
    });
    console.log('📝 Existing applications for this job/worker:', existingApplications.length);
    
    if (existingApplications.length > 0) {
      console.log('⚠️ Worker has already applied for this job');
      console.log('📊 Application details:', existingApplications[0]);
    } else {
      console.log('✅ Worker has not applied for this job yet');
    }
    
    // Check job status
    console.log('📊 Job status before:', job.status);
    
    // Test creating an application
    const testApplication = new JobApplication({
      job: job._id,
      worker: worker._id,
      employer: job.employer,
      status: 'pending',
      workerDetails: {
        name: worker.name,
        phone: worker.phone || '',
        skills: worker.skills || [],
        rating: worker.rating?.average || 0
      },
      statusHistory: [{
        status: 'pending',
        changedAt: new Date(),
        note: 'Test application'
      }]
    });
    
    await testApplication.save();
    console.log('✅ Test application created:', testApplication._id);
    
    // Check if job status should be updated
    if (job.status === 'active') {
      job.status = 'in-progress';
      await job.save();
      console.log('🔄 Job status updated to in-progress');
    } else {
      console.log('ℹ️ Job status is already:', job.status);
    }
    
    // Verify the application was created
    const savedApplication = await JobApplication.findById(testApplication._id)
      .populate('job')
      .populate('worker')
      .populate('employer');
    
    console.log('📋 Saved application:', {
      id: savedApplication._id,
      jobTitle: savedApplication.job?.title,
      workerName: savedApplication.worker?.name,
      status: savedApplication.status,
      createdAt: savedApplication.createdAt
    });
    
    // Clean up test application
    await JobApplication.findByIdAndDelete(testApplication._id);
    console.log('🧹 Test application cleaned up');
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

testJobApplications(); 