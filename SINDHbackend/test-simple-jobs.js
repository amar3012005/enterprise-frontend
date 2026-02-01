const fetch = require('node-fetch');

const API_BASE = 'http://localhost:10000/api';

async function testSimpleJobs() {
  console.log('🧪 Simple Jobs API Test\n');

  try {
    // Test basic jobs endpoint
    console.log('1️⃣ Testing GET /jobs...');
    const response = await fetch(`${API_BASE}/jobs`);
    
    console.log(`📡 Status: ${response.status}`);
    console.log(`📡 OK: ${response.ok}`);
    
    if (response.ok) {
      const jobs = await response.json();
      console.log(`✅ Success! Found ${jobs.length} jobs`);
      
      if (jobs.length > 0) {
        console.log('📋 Sample job:');
        console.log(`   Title: ${jobs[0].title}`);
        console.log(`   Company: ${jobs[0].companyName}`);
        console.log(`   Location: ${jobs[0].location?.city}, ${jobs[0].location?.state}`);
        console.log(`   Salary: ₹${jobs[0].salary}`);
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Error: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSimpleJobs(); 