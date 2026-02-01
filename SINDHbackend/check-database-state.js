const mongoose = require('mongoose');
const Worker = require('./server/src/models/Worker');
const JobApplication = require('./server/src/models/JobApplication');
const Job = require('./server/src/models/Job');
const Employer = require('./server/src/models/Employer');

async function checkDatabaseState() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sindh');
    console.log('Connected to MongoDB\n');
    
    // Check all collections
    console.log('=== DATABASE STATE CHECK ===\n');
    
    // Workers
    const workers = await Worker.find({});
    console.log(`WORKERS (${workers.length} found):`);
    workers.forEach((worker, index) => {
      console.log(`${index + 1}. ${worker.name}`);
      console.log(`   ID: ${worker._id}`);
      console.log(`   Phone: ${worker.phone}`);
      console.log(`   Balance: ₹${worker.balance || 0}`);
      console.log(`   Earnings: ${worker.earnings?.length || 0} entries`);
      console.log('');
    });
    
    // Employers
    const employers = await Employer.find({});
    console.log(`EMPLOYERS (${employers.length} found):`);
    employers.forEach((employer, index) => {
      console.log(`${index + 1}. ${employer.name || employer.companyName}`);
      console.log(`   ID: ${employer._id}`);
      console.log(`   Phone: ${employer.phone}`);
      console.log('');
    });
    
    // Jobs
    const jobs = await Job.find({});
    console.log(`JOBS (${jobs.length} found):`);
    jobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.title}`);
      console.log(`   ID: ${job._id}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Salary: ₹${job.salary}`);
      console.log(`   Employer: ${job.employer}`);
      console.log('');
    });
    
    // Job Applications
    const applications = await JobApplication.find({});
    console.log(`JOB APPLICATIONS (${applications.length} found):`);
    applications.forEach((app, index) => {
      console.log(`${index + 1}. Application ${app._id}`);
      console.log(`   Worker: ${app.worker}`);
      console.log(`   Job: ${app.job}`);
      console.log(`   Employer: ${app.employer}`);
      console.log(`   Status: ${app.status}`);
      console.log(`   Payment Status: ${app.paymentStatus || 'not set'}`);
      console.log(`   Payment Amount: ₹${app.paymentAmount || 0}`);
      console.log(`   Worker Name: ${app.workerDetails?.name || 'not set'}`);
      console.log('');
    });
    
    // Check for the specific problematic application
    const problematicApp = await JobApplication.findById('686643c6e94fe0e7c6214b3a');
    if (problematicApp) {
      console.log('PROBLEMATIC APPLICATION FOUND:');
      console.log(`   Current worker ID: ${problematicApp.worker}`);
      console.log(`   Employer ID: ${problematicApp.employer}`);
      console.log(`   Worker name in details: ${problematicApp.workerDetails?.name}`);
      console.log(`   Worker phone in details: ${problematicApp.workerDetails?.phone}`);
    } else {
      console.log('❌ Problematic application NOT found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkDatabaseState();
