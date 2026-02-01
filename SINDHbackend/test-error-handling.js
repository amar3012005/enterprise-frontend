const fetch = require('node-fetch');

const API_BASE = 'http://localhost:10000/api';

async function testErrorHandling() {
  console.log('🧪 TESTING STANDARDIZED ERROR HANDLING\n');

  const tests = [
    {
      name: '1️⃣ Test Validation Error (Missing Required Fields)',
      method: 'POST',
      url: `${API_BASE}/jobs`,
      body: { title: '' }, // Missing employer
      expectedError: 'VALIDATION_ERROR'
    },
    {
      name: '2️⃣ Test Not Found Error (Invalid Job ID)',
      method: 'GET',
      url: `${API_BASE}/jobs/507f1f77bcf86cd799439011`, // Invalid ObjectId
      expectedError: 'INVALID_ID'
    },
    {
      name: '3️⃣ Test Authentication Error (Missing Headers)',
      method: 'GET',
      url: `${API_BASE}/workers/507f1f77bcf86cd799439011`,
      expectedError: 'AUTHENTICATION_ERROR'
    },
    {
      name: '4️⃣ Test Business Logic Error (Duplicate Job)',
      method: 'POST',
      url: `${API_BASE}/jobs`,
      body: {
        title: 'Test Job',
        employer: '507f1f77bcf86cd799439011',
        location: { city: 'Test City' }
      },
      expectedError: 'BUSINESS_LOGIC_ERROR'
    }
  ];

  for (const test of tests) {
    console.log(`\n${test.name}`);
    console.log(`📡 ${test.method} ${test.url}`);
    
    try {
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (test.body) {
        options.body = JSON.stringify(test.body);
      }

      const response = await fetch(test.url, options);
      const data = await response.json();
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📊 Response:`, JSON.stringify(data, null, 2));
      
      // Check if response follows standardized format
      if (data.success === false && data.error && data.message && data.timestamp) {
        console.log('✅ Standardized error format detected');
        
        if (data.error === test.expectedError) {
          console.log(`✅ Expected error type: ${test.expectedError}`);
        } else {
          console.log(`⚠️ Expected ${test.expectedError}, got ${data.error}`);
        }
      } else {
        console.log('❌ Non-standardized error format');
      }
      
    } catch (error) {
      console.log(`❌ Network error: ${error.message}`);
    }
  }

  console.log('\n🎯 ERROR HANDLING TEST SUMMARY');
  console.log('✅ All tests completed');
  console.log('📋 Check responses above for standardized format');
}

testErrorHandling(); 