const mongoose = require('mongoose');
const Job = require('./server/src/models/Job');
const Employer = require('./server/src/models/Employer');
const Worker = require('./server/src/models/Worker');
const JobApplication = require('./server/src/models/JobApplication');

async function seedTestData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sindh');
    console.log('Connected to MongoDB');
    
    // Find existing worker
    const worker = await Worker.findOne({});
    if (!worker) {
      console.log('No worker found. Please register a worker first.');
      return;
    }
    console.log('Found worker:', worker.name, worker._id);
    
    // Create test employer with proper schema
    let employer = await Employer.findOne({});
    if (!employer) {
      employer = new Employer({
        name: 'HAWK Construction Ltd',
        companyName: 'HAWK Construction Ltd',
        email: 'hawk@example.com',
        phone: '9876543210',
        company: {
          name: 'HAWK Construction Ltd',  // Required field
          description: 'Leading construction company',
          industry: 'Construction'
        },
        location: {
          city: 'MAHABUBNAGAR',
          state: 'Telangana',
          address: 'Industrial Area, Mahabubnagar'
        }
      });
      await employer.save();
      console.log('Created test employer:', employer.name);
    } else {
      console.log('Found existing employer:', employer.name);
    }
    
    // Create additional completed jobs for testing
    const jobsData = [
      {
        title: 'JOB-2',
        companyName: 'HAWK',
        description: 'WOEQPIHPQ Construction work - Additional building project',
        category: 'Construction',
        salary: 300,
        location: {
          city: 'MAHABUBNAGAR',
          state: 'Telangana',
          type: 'onsite',
          street: 'Construction Site Area'
        },
        employer: employer._id,
        status: 'completed'
      }
    ];
    
    const createdJobs = [];
    for (const jobData of jobsData) {
      // Check if job already exists
      const existingJob = await Job.findOne({ title: jobData.title });
      if (!existingJob) {
        const job = new Job(jobData);
        await job.save();
        createdJobs.push(job);
        console.log('Created job:', job.title, job._id);
      } else {
        createdJobs.push(existingJob);
        console.log('Job already exists:', existingJob.title);
      }
    }
    
    // Create job applications for completed jobs
    for (const job of createdJobs) {
      const existingApp = await JobApplication.findOne({
        worker: worker._id,
        job: job._id
      });
      
      if (!existingApp) {
        const application = new JobApplication({
          worker: worker._id,
          job: job._id,
          employer: employer._id,
          status: 'completed',
          paymentStatus: 'paid',
          paymentAmount: job.salary, // Payment amount equals job salary
          paymentDate: new Date(),
          jobCompletedDate: new Date(),
          workerDetails: {
            name: worker.name,
            phone: worker.phone,
            skills: worker.skills || ['Construction'],
            rating: 0
          },
          applicationDetails: {
            appliedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
          }
        });
        
        await application.save();
        console.log(`Created completed application for: ${job.title} - Payment: ₹${job.salary}`);
        
        // Job is already marked as completed in jobsData
      }
    }
    
    // Update employer's posted jobs
    const allJobs = await Job.find({ employer: employer._id });
    employer.postedJobs = allJobs.map(job => job._id);
    await employer.save();
    
    // Update worker balance using the same logic
    const allCompletedApps = await JobApplication.find({
      worker: worker._id,
      status: 'completed',
      paymentStatus: 'paid'
    }).populate('job');
    
    const totalBalance = allCompletedApps.reduce((sum, app) => {
      return sum + (app.paymentAmount || app.job?.salary || 0);
    }, 0);
    
    worker.balance = totalBalance;
    worker.earnings = allCompletedApps.map(app => ({
      jobId: app.job._id,
      amount: app.paymentAmount || app.job?.salary || 0,
      description: `Payment for: ${app.job?.title}`,
      date: app.paymentDate || new Date()
    }));
    
    await worker.save();
    
    console.log('\n✅ Test data seeded successfully!');
    console.log(`Worker balance: ₹${worker.balance}`);
    console.log(`Jobs created: ${createdJobs.length}`);
    console.log(`Total completed applications: ${allCompletedApps.length}`);
    
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedTestData();
