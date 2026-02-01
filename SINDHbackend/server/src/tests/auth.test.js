const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Worker.deleteMany({});
  await Employer.deleteMany({});
});

describe('Authentication Tests', () => {
  describe('Worker Authentication', () => {
    const workerPhone = '+919876543210';
    
    test('Should request OTP for worker', async () => {
      const response = await request(app)
        .post('/auth/worker/request-otp')
        .send({
          phone: workerPhone,
          name: 'Test Worker'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('OTP sent successfully');
      expect(response.body.otp).toBeDefined();
      
      // Verify worker was created
      const worker = await Worker.findOne({ phone: workerPhone });
      expect(worker).toBeDefined();
      expect(worker.name).toBe('Test Worker');
    });

    test('Should verify OTP and login worker', async () => {
      // First request OTP
      const otpResponse = await request(app)
        .post('/auth/worker/request-otp')
        .send({
          phone: workerPhone,
          name: 'Test Worker'
        });

      // Then verify OTP
      const loginResponse = await request(app)
        .post('/auth/worker/verify-otp')
        .send({
          phone: workerPhone,
          otp: otpResponse.body.otp
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.worker).toBeDefined();
      expect(loginResponse.body.token).toBeDefined();
      expect(loginResponse.body.worker.phone).toBe(workerPhone);
    });

    test('Should fail with invalid OTP', async () => {
      // First request OTP
      await request(app)
        .post('/auth/worker/request-otp')
        .send({
          phone: workerPhone,
          name: 'Test Worker'
        });

      // Then try invalid OTP
      const loginResponse = await request(app)
        .post('/auth/worker/verify-otp')
        .send({
          phone: workerPhone,
          otp: '000000'
        });

      expect(loginResponse.status).toBe(400);
      expect(loginResponse.body.message).toBe('Invalid OTP');
    });

    test('Should generate different OTPs for multiple requests', async () => {
      // First OTP request
      const firstResponse = await request(app)
        .post('/auth/worker/request-otp')
        .send({
          phone: workerPhone,
          name: 'Test Worker'
        });

      expect(firstResponse.status).toBe(200);
      const firstOTP = firstResponse.body.otp;

      // Second OTP request
      const secondResponse = await request(app)
        .post('/auth/worker/request-otp')
        .send({
          phone: workerPhone,
          name: 'Test Worker'
        });

      expect(secondResponse.status).toBe(200);
      const secondOTP = secondResponse.body.otp;

      // Verify OTPs are different
      expect(firstOTP).not.toBe(secondOTP);

      // Try to verify with the first (now invalid) OTP
      const firstLoginResponse = await request(app)
        .post('/auth/worker/verify-otp')
        .send({
          phone: workerPhone,
          otp: firstOTP
        });

      expect(firstLoginResponse.status).toBe(400);
      expect(firstLoginResponse.body.message).toBe('Invalid OTP');

      // Verify with the second (valid) OTP
      const secondLoginResponse = await request(app)
        .post('/auth/worker/verify-otp')
        .send({
          phone: workerPhone,
          otp: secondOTP
        });

      expect(secondLoginResponse.status).toBe(200);
      expect(secondLoginResponse.body.worker).toBeDefined();
      expect(secondLoginResponse.body.token).toBeDefined();
    });
  });

  describe('Employer Authentication', () => {
    const employerPhone = '+919876543211';
    
    test('Should request OTP for employer', async () => {
      const response = await request(app)
        .post('/auth/employer/request-otp')
        .send({
          phone: employerPhone,
          name: 'Test Employer',
          companyName: 'Test Company'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('OTP sent successfully');
      expect(response.body.otp).toBeDefined();
      
      // Verify employer was created
      const employer = await Employer.findOne({ phone: employerPhone });
      expect(employer).toBeDefined();
      expect(employer.name).toBe('Test Employer');
    });

    test('Should verify OTP and login employer', async () => {
      // First request OTP
      const otpResponse = await request(app)
        .post('/auth/employer/request-otp')
        .send({
          phone: employerPhone,
          name: 'Test Employer',
          companyName: 'Test Company'
        });

      // Then verify OTP
      const loginResponse = await request(app)
        .post('/auth/employer/verify-otp')
        .send({
          phone: employerPhone,
          otp: otpResponse.body.otp
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.employer).toBeDefined();
      expect(loginResponse.body.token).toBeDefined();
      expect(loginResponse.body.employer.phone).toBe(employerPhone);
    });

    test('Should fail with expired OTP', async () => {
      // First request OTP
      const otpResponse = await request(app)
        .post('/auth/employer/request-otp')
        .send({
          phone: employerPhone,
          name: 'Test Employer',
          companyName: 'Test Company'
        });

      // Manually expire the OTP
      const employer = await Employer.findOne({ phone: employerPhone });
      employer.otp.expiresAt = new Date(Date.now() - 1000); // Set to past
      await employer.save();

      // Then try to verify
      const loginResponse = await request(app)
        .post('/auth/employer/verify-otp')
        .send({
          phone: employerPhone,
          otp: otpResponse.body.otp
        });

      expect(loginResponse.status).toBe(400);
      expect(loginResponse.body.message).toBe('OTP has expired');
    });

    test('Should generate different OTPs for multiple requests', async () => {
      // First OTP request
      const firstResponse = await request(app)
        .post('/auth/employer/request-otp')
        .send({
          phone: employerPhone,
          name: 'Test Employer',
          companyName: 'Test Company'
        });

      expect(firstResponse.status).toBe(200);
      const firstOTP = firstResponse.body.otp;

      // Second OTP request
      const secondResponse = await request(app)
        .post('/auth/employer/request-otp')
        .send({
          phone: employerPhone,
          name: 'Test Employer',
          companyName: 'Test Company'
        });

      expect(secondResponse.status).toBe(200);
      const secondOTP = secondResponse.body.otp;

      // Verify OTPs are different
      expect(firstOTP).not.toBe(secondOTP);

      // Try to verify with the first (now invalid) OTP
      const firstLoginResponse = await request(app)
        .post('/auth/employer/verify-otp')
        .send({
          phone: employerPhone,
          otp: firstOTP
        });

      expect(firstLoginResponse.status).toBe(400);
      expect(firstLoginResponse.body.message).toBe('Invalid OTP');

      // Verify with the second (valid) OTP
      const secondLoginResponse = await request(app)
        .post('/auth/employer/verify-otp')
        .send({
          phone: employerPhone,
          otp: secondOTP
        });

      expect(secondLoginResponse.status).toBe(200);
      expect(secondLoginResponse.body.employer).toBeDefined();
      expect(secondLoginResponse.body.token).toBeDefined();
    });
  });

  describe('Protected Routes', () => {
    let workerToken;
    const workerPhone = '+919876543210';

    beforeEach(async () => {
      // Setup a worker and get token
      const otpResponse = await request(app)
        .post('/auth/worker/request-otp')
        .send({
          phone: workerPhone,
          name: 'Test Worker'
        });

      const loginResponse = await request(app)
        .post('/auth/worker/verify-otp')
        .send({
          phone: workerPhone,
          otp: otpResponse.body.otp
        });

      workerToken = loginResponse.body.token;
    });

    test('Should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.phone).toBe(workerPhone);
    });

    test('Should reject access without token', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
    });
  });
}); 