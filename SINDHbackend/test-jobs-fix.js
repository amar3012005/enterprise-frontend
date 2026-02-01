const fetch = require('node-fetch');

const API_BASE = 'http://localhost:10000/api';

async function testJobsFix() {
  console.log('🔧 TESTING JOBS API FIX\n');

  try {
    // Test the correct URL pattern that AvailableJobs now uses
    console.log('1️⃣ Testing GET /api/jobs (correct pattern)...');
    const response = await fetch(`${API_BASE}/jobs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Type': 'guest',
        'User-ID': ''
      }
    });
    
    console.log(`📡 Status: ${response.status}`);
    console.log(`📡 OK: ${response.ok}`);
    console.log(`📡 URL: ${API_BASE}/jobs`);
    
    if (response.ok) {
      const jobs = await response.json();
      console.log(`✅ Success! Found ${jobs.length} jobs`);
      
      // Look for the specific job
      const specificJob = jobs.find(job => 
        job.title === 'Jobby' && 
        job.companyName === 'HAWKY'
      );
      
      if (specificJob) {
        console.log('🎯 Found the specific job!');
        console.log('📋 Job details:');
        console.log(`   ID: ${specificJob._id}`);
        console.log(`   Title: ${specificJob.title}`);
        console.log(`   Company: ${specificJob.companyName}`);
        console.log(`   Location: ${specificJob.location?.city}, ${specificJob.location?.state}`);
        console.log(`   Salary: ₹${specificJob.salary}`);
        console.log(`   Status: ${specificJob.status}`);
      } else {
        console.log('❌ Specific job not found');
        console.log('📋 Available jobs:');
        jobs.forEach((job, index) => {
          console.log(`   ${index + 1}. ${job.title} - ${job.companyName} - ${job.location?.city}, ${job.location?.state} - ₹${job.salary} - ${job.status}`);
        });
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Error: ${errorText}`);
    }

    console.log('');

    // Test with status filter
    console.log('2️⃣ Testing GET /api/jobs?status=active,in-progress...');
    const response2 = await fetch(`${API_BASE}/jobs?status=active,in-progress`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Type': 'guest',
        'User-ID': ''
      }
    });
    
    console.log(`📡 Status: ${response2.status}`);
    console.log(`📡 OK: ${response2.ok}`);
    
    if (response2.ok) {
      const jobs2 = await response2.json();
      console.log(`✅ Success! Found ${jobs2.length} active/in-progress jobs`);
      
      const specificJob2 = jobs2.find(job => 
        job.title === 'Jobby' && 
        job.companyName === 'HAWKY'
      );
      
      if (specificJob2) {
        console.log('🎯 Found the specific job in active jobs!');
      } else {
        console.log('❌ Specific job not found in active jobs');
      }
    } else {
      const errorText = await response2.text();
      console.log(`❌ Error: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testJobsFix(); 