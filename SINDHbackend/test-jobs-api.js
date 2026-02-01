const fetch = require('node-fetch');

const API_BASE = 'http://localhost:10000/api';

async function testJobsAPI() {
  console.log('🧪 Testing Jobs API for Workers...\n');

  try {
    // Test 1: Get all available jobs (no filters)
    console.log('1️⃣ Testing GET /api/jobs (all jobs)...');
    const response1 = await fetch(`${API_BASE}/jobs`);
    const jobs1 = await response1.json();
    console.log(`✅ Found ${jobs1.length} jobs`);
    if (jobs1.length > 0) {
      console.log(`   Sample job: ${jobs1[0].title} - ${jobs1[0].companyName}`);
    }
    console.log('');

    // Test 2: Get jobs with status filter
    console.log('2️⃣ Testing GET /api/jobs?status=active,in-progress...');
    const response2 = await fetch(`${API_BASE}/jobs?status=active,in-progress`);
    const jobs2 = await response2.json();
    console.log(`✅ Found ${jobs2.length} active/in-progress jobs`);
    console.log('');

    // Test 3: Get jobs with worker ID (to check application status)
    console.log('3️⃣ Testing GET /api/jobs?workerId=test-worker...');
    const response3 = await fetch(`${API_BASE}/jobs?workerId=test-worker`);
    const jobs3 = await response3.json();
    console.log(`✅ Found ${jobs3.length} jobs with worker context`);
    if (jobs3.length > 0) {
      const appliedJobs = jobs3.filter(job => job.hasApplied);
      console.log(`   Jobs with applications: ${appliedJobs.length}`);
    }
    console.log('');

    // Test 4: Get job count
    console.log('4️⃣ Testing GET /api/jobs/count...');
    const response4 = await fetch(`${API_BASE}/jobs/count`);
    const countData = await response4.json();
    console.log(`✅ Job count: ${countData.count || countData}`);
    console.log('');

    // Test 5: Test with category filter
    console.log('5️⃣ Testing GET /api/jobs?category=construction...');
    const response5 = await fetch(`${API_BASE}/jobs?category=construction`);
    const jobs5 = await response5.json();
    console.log(`✅ Found ${jobs5.length} construction jobs`);
    console.log('');

    // Test 6: Test with location filter
    console.log('6️⃣ Testing GET /api/jobs?location=mumbai...');
    const response6 = await fetch(`${API_BASE}/jobs?location=mumbai`);
    const jobs6 = await response6.json();
    console.log(`✅ Found ${jobs6.length} jobs in Mumbai`);
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Total jobs available: ${jobs1.length}`);
    console.log(`   - Active jobs: ${jobs2.length}`);
    console.log(`   - Construction jobs: ${jobs5.length}`);
    console.log(`   - Mumbai jobs: ${jobs6.length}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testJobsAPI(); 