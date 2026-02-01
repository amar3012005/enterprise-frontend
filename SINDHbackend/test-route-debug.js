const fetch = require('node-fetch');

const API_BASE = 'http://localhost:10000/api';

async function testRouteDebug() {
  console.log('🔍 ROUTE DEBUG - Testing Exact AvailableJobs Route\n');

  try {
    // Test 1: Test the exact route used by AvailableJobs
    console.log('1️⃣ Testing GET /api/jobs (exact AvailableJobs route)...');
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
        console.log(`   Category: ${specificJob.category}`);
      } else {
        console.log('❌ Specific job not found in response');
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

    // Test 2: Test with status filter (like AvailableJobs does)
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
        console.log('📋 Active jobs:');
        jobs2.forEach((job, index) => {
          console.log(`   ${index + 1}. ${job.title} - ${job.companyName} - ${job.location?.city}, ${job.location?.state} - ₹${job.salary} - ${job.status}`);
        });
      }
    } else {
      const errorText = await response2.text();
      console.log(`❌ Error: ${errorText}`);
    }

    console.log('');

    // Test 3: Test without any filters
    console.log('3️⃣ Testing GET /api/jobs (no filters)...');
    const response3 = await fetch(`${API_BASE}/jobs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log(`📡 Status: ${response3.status}`);
    console.log(`📡 OK: ${response3.ok}`);
    
    if (response3.ok) {
      const jobs3 = await response3.json();
      console.log(`✅ Success! Found ${jobs3.length} jobs (no filters)`);
      
      const specificJob3 = jobs3.find(job => 
        job.title === 'Jobby' && 
        job.companyName === 'HAWKY'
      );
      
      if (specificJob3) {
        console.log('🎯 Found the specific job without filters!');
      } else {
        console.log('❌ Specific job not found without filters');
      }
    } else {
      const errorText = await response3.text();
      console.log(`❌ Error: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRouteDebug(); 