const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const Job = require('../models/Job');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-testing';

describe('Rating System Tests', () => {
  let worker;
  let employer;
  let job;
  let employerToken;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/I N D U S_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });

  beforeEach(async () => {
    // Clear the database
    await Worker.deleteMany({});
    await Employer.deleteMany({});
    await Job.deleteMany({});

    // Create a test worker
    worker = await Worker.create({
      phone: '+919999999999',
      name: 'Test Worker',
      age: 30,
      skills: ['Plumbing', 'Electrical'],
      experience: 5,
      languages: ['Hindi', 'English']
    });

    // Create a test employer
    employer = await Employer.create({
      phone: '+918888888888',
      name: 'Test Employer',
      company: {
        name: 'Test Company',
        description: 'A test company'
      }
    });

    // Generate employer token
    employerToken = jwt.sign(
      { _id: employer._id.toString(), role: 'employer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create test job
    job = await Job.create({
      title: 'Test Job',
      description: 'Test job description',
      location: {
        address: 'Test Location',
        coordinates: {
          type: 'Point',
          coordinates: [72.8777, 19.0760]
        }
      },
      employer: employer._id,
      worker: worker._id,
      selectedWorker: worker._id,
      applications: [{
        worker: worker._id,
        status: 'accepted',
        appliedAt: new Date()
      }],
      status: 'completed',
      requiredSkills: ['Plumbing'],
      wage: {
        amount: 1000,
        period: 'daily'
      },
      duration: '7 days',
      startDate: new Date(Date.now() + 86400000), // Tomorrow
      endDate: new Date()
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Rating Validation', () => {
    test('should reject rating below 0', async () => {
      const response = await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: -1,
          comment: 'Test rating',
          jobId: job._id
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Rating must be between 0 and 100');
    });

    test('should reject rating above 100', async () => {
      const response = await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 101,
          comment: 'Test rating',
          jobId: job._id
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Rating must be between 0 and 100');
    });

    test('should accept valid rating between 0 and 100', async () => {
      // Log IDs for debugging
      console.log('Test IDs:', {
        employerId: employer._id.toString(),
        tokenId: jwt.decode(employerToken)._id,
        jobEmployerId: job.employer.toString()
      });

      const response = await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 75,
          comment: 'Good work',
          jobId: job._id
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('newShaktiScore');
    });
  });

  describe('ShaktiScore Calculation', () => {
    test('first rating should average with initial ShaktiScore', async () => {
      const initialScore = worker.shaktiScore;
      const ratingScore = 80;

      const response = await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: ratingScore,
          comment: 'First rating',
          jobId: job._id
        });

      const expectedScore = Math.round((initialScore + ratingScore) / 2);
      expect(response.body.newShaktiScore).toBe(expectedScore);

      const updatedWorker = await Worker.findById(worker._id);
      expect(updatedWorker.totalRatings).toBe(1);
    });

    test('multiple ratings should calculate running average', async () => {
      // Create another completed job
      const secondJob = await Job.create({
        title: 'Second Test Job',
        description: 'Test job description',
        location: {
          address: 'Test Location',
          coordinates: {
            type: 'Point',
            coordinates: [72.8777, 19.0760]
          }
        },
        employer: employer._id,
        worker: worker._id,
        selectedWorker: worker._id,
        applications: [{
          worker: worker._id,
          status: 'accepted',
          appliedAt: new Date()
        }],
        status: 'completed',
        requiredSkills: ['Plumbing'],
        wage: {
          amount: 1000,
          period: 'daily'
        },
        duration: '7 days',
        startDate: new Date(Date.now() + 86400000), // Tomorrow
        endDate: new Date()
      });

      // First rating
      await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 80,
          comment: 'First rating',
          jobId: job._id
        });

      // Second rating
      const response = await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 90,
          comment: 'Second rating',
          jobId: secondJob._id
        });

      const updatedWorker = await Worker.findById(worker._id);
      expect(updatedWorker.totalRatings).toBe(2);
      expect(response.status).toBe(200);
    });

    test('should handle progressive rating improvements', async () => {
      const initialScore = worker.shaktiScore;
      const ratings = [60, 70, 80, 90, 95]; // Progressively improving ratings
      let currentWorker = worker;
      let currentScore = initialScore;

      // Create additional jobs for each rating
      const jobs = await Promise.all(ratings.map(async (_, index) => {
        return Job.create({
          title: `Job ${index + 1}`,
          description: 'Test job description',
          location: {
            address: 'Test Location',
            coordinates: {
              type: 'Point',
              coordinates: [72.8777, 19.0760]
            }
          },
          employer: employer._id,
          worker: worker._id,
          selectedWorker: worker._id,
          applications: [{
            worker: worker._id,
            status: 'accepted',
            appliedAt: new Date()
          }],
          status: 'completed',
          requiredSkills: ['Plumbing'],
          wage: {
            amount: 1000,
            period: 'daily'
          },
          duration: '7 days',
          startDate: new Date(Date.now() + 86400000), // Tomorrow
          endDate: new Date()
        });
      }));

      for (let i = 0; i < ratings.length; i++) {
        const rating = ratings[i];
        const response = await request(app)
          .post(`/ratings/worker/${worker._id}`)
          .set('Authorization', `Bearer ${employerToken}`)
          .send({
            score: rating,
            comment: `Rating: ${rating}`,
            jobId: jobs[i]._id
          });

        expect(response.status).toBe(200);
        
        // Verify the running average calculation
        currentWorker = await Worker.findById(worker._id);
        
        // Calculate expected score based on current rating
        if (currentWorker.totalRatings === 1) {
          currentScore = Math.round((initialScore + rating) / 2);
        } else {
          currentScore = Math.round((currentScore * (currentWorker.totalRatings - 1) + rating) / currentWorker.totalRatings);
        }
        
        expect(response.body.newShaktiScore).toBe(currentScore);
        expect(currentWorker.totalRatings).toBe(i + 1);
      }

      // Final verification
      const finalWorker = await Worker.findById(worker._id);
      expect(finalWorker.totalRatings).toBe(ratings.length);
      expect(finalWorker.shaktiScore).toBeGreaterThan(initialScore); // Score should have improved
    });
  });

  describe('Authorization', () => {
    test('should reject rating from non-employer', async () => {
      // Create worker token
      const workerToken = jwt.sign(
        { _id: worker._id.toString(), role: 'worker' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          score: 75,
          comment: 'Test rating',
          jobId: job._id
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Only employers can rate workers');
    });
  });
}); 