const fetch = require('node-fetch');

// Test worker registration endpoints
async function testWorkerRegistration() {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'http://localhost:10000'
    : 'http://localhost:10000';
  
  // Test worker registration data
  const workerData = {
    name: 'Test Worker Enhanced',
    age: 28,
    phone: '9876543211',
    email: 'test.worker@example.com',
    gender: 'Male',
    aadharNumber: '123456789013',
    skills: ['Construction', 'Plumbing', 'Electrical'],
    experience: '3-5 years',
    preferredCategory: 'Construction',
    expectedSalary: '₹800 per day',
    languages: ['Hindi', 'English'],
    location: {
      village: 'Test Village Enhanced',
      district: 'Test District Enhanced',
      state: 'Test State Enhanced',
      pincode: '123456'
    },
    preferredWorkType: 'Full-time daily work',
    availability: 'Available immediately',
    workRadius: 15,
    bio: 'Experienced construction worker with multiple skills and good work ethic.'
  };
  
  try {
    console.log('\n🧪 Testing enhanced worker registration...');
    
    // Test initiate registration
    console.log('📡 Testing initiate registration...');
    const initiateResponse = await fetch(`${baseUrl}/api/workers/initiate-registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (initiateResponse.ok) {
      const initiateResult = await initiateResponse.json();
      console.log('✅ Initiate registration successful:', initiateResult.message);
    } else {
      console.log('❌ Initiate registration failed:', initiateResponse.status);
    }
    
    // Test worker registration
    console.log('\n📡 Testing worker registration...');
    const workerResponse = await fetch(`${baseUrl}/api/workers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workerData)
    });
    
    console.log('📡 Worker registration status:', workerResponse.status);
    
    if (workerResponse.ok) {
      const result = await workerResponse.json();
      console.log('✅ Worker registration successful:', result.worker?.name);
      console.log('📊 ShaktiScore:', result.worker?.shaktiScore);
      console.log('📅 Registration date:', result.worker?.registrationDate);
      console.log('🔐 Login status:', result.worker?.isLoggedIn);
    } else {
      const error = await workerResponse.json();
      console.log('❌ Worker registration failed:', error.message);
    }
    
    // Test OTP functionality
    console.log('\n📡 Testing OTP functionality...');
    const otpRequestResponse = await fetch(`${baseUrl}/api/auth/worker/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9876543211' })
    });
    
    if (otpRequestResponse.ok) {
      const otpResult = await otpRequestResponse.json();
      console.log('✅ OTP request successful:', otpResult.message);
      console.log('🔢 OTP code:', otpResult.otp);
      
      // Test OTP verification
      console.log('\n📡 Testing OTP verification...');
      const otpVerifyResponse = await fetch(`${baseUrl}/api/auth/worker/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: '9876543211', 
          otp: otpResult.otp 
        })
      });
      
      if (otpVerifyResponse.ok) {
        const verifyResult = await otpVerifyResponse.json();
        console.log('✅ OTP verification successful:', verifyResult.message);
        console.log('🎫 Token generated:', !!verifyResult.token);
      } else {
        const verifyError = await otpVerifyResponse.json();
        console.log('❌ OTP verification failed:', verifyError.message);
      }
    } else {
      const otpError = await otpRequestResponse.json();
      console.log('❌ OTP request failed:', otpError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testWorkerRegistration().then(() => {
  console.log('\n🏁 Worker registration backend test completed!');
}).catch(error => {
  console.error('❌ Test suite failed:', error);
}); 