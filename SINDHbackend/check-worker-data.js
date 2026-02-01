const mongoose = require('mongoose');
const Worker = require('./server/src/models/Worker');
const JobApplication = require('./server/src/models/JobApplication');
const Job = require('./server/src/models/Job');
const Employer = require('./server/src/models/Employer');

async function checkWorkerData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sindh');
    console.log('Connected to MongoDB\n');
    
    // Check workers
    const workers = await Worker.find({});
    console.log(`Found ${workers.length} workers:`);
    workers.forEach((worker, index) => {
      console.log(`${index + 1}. Name: ${worker.name}`);
      console.log(`   ID: ${worker._id}`);
      console.log(`   Balance: ₹${worker.balance || 0}`);
      console.log(`   Earnings: ${worker.earnings?.length || 0} entries`);
      console.log('');
    });
    
    // Check employers
    const employers = await Employer.find({});
    console.log(`Found ${employers.length} employers:`);
    employers.forEach((employer, index) => {
      console.log(`${index + 1}. Name: ${employer.name || employer.companyName}`);
      console.log(`   ID: ${employer._id}`);
      console.log(`   Posted Jobs: ${employer.postedJobs?.length || 0}`);
      console.log('');
    });
    
    // Check jobs
    console.log('Checking jobs...');
    const jobs = await Job.find({});
    console.log(`Found ${jobs.length} jobs:`);
    
    if (jobs.length === 0) {
      console.log('No jobs found in the database\n');
    } else {
      jobs.forEach((job, index) => {
        console.log(`${index + 1}. Job: ${job.title}`);
        console.log(`   ID: ${job._id}`);
        console.log(`   Status: ${job.status}`);
        console.log(`   Salary: ₹${job.salary || 0}`);
        console.log(`   Company: ${job.companyName}`);
        console.log(`   Employer ID: ${job.employer}`);
        console.log('');
      });
    }
    
    // Check job applications
    console.log('Checking job applications...');
    const applications = await JobApplication.find({});
    console.log(`Found ${applications.length} job applications:`);
    
    if (applications.length === 0) {
      console.log('No job applications found in the database\n');
    } else {
      for (let i = 0; i < applications.length; i++) {
        const app = applications[i];
        console.log(`${i + 1}. Application ID: ${app._id}`);
        console.log(`   Worker ID: ${app.worker}`);
        console.log(`   Job ID: ${app.job}`);
        console.log(`   Status: ${app.status}`);
        console.log(`   Payment Status: ${app.paymentStatus || 'not set'}`);
        console.log(`   Payment Amount: ₹${app.paymentAmount || 0}`);
        console.log('');
      }
    }
    
    // Check completed applications specifically
    const completedApps = await JobApplication.find({ status: 'completed' });
    console.log(`Found ${completedApps.length} completed applications`);
    
    // Check if the worker IDs match
    console.log('Worker ID mapping check:');
    workers.forEach(worker => {
      const workerApps = applications.filter(app => 
        app.worker.toString() === worker._id.toString()
      );
      console.log(`Worker ${worker.name} (${worker._id}) has ${workerApps.length} applications`);
      
      const completedWorkerApps = workerApps.filter(app => app.status === 'completed');
      console.log(`  - ${completedWorkerApps.length} completed applications`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkWorkerData();
