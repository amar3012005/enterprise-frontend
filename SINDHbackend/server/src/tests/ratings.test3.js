const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const Job = require('../models/Job');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-testing';

describe('Advanced Rating System Tests', () => {
  let worker;
  let employer;
  let job;
  let employerToken;

  beforeAll(async () => {
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

    // Create test worker with specific initial attributes
    worker = await Worker.create({
      phone: '+919999999999',
      name: 'Test Worker',
      age: 35,
      skills: ['Plumbing', 'Electrical', 'Carpentry'],
      experience: 10,
      languages: ['Hindi', 'English', 'Marathi'],
      location: {
        address: 'Mumbai, Maharashtra',
        coordinates: {
          type: 'Point',
          coordinates: [72.8777, 19.0760]
        }
      }
    });

    // Create test employer
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
        address: 'Mumbai, Maharashtra',
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
      startDate: new Date(Date.now() - 14 * 86400000), // 14 days ago
      endDate: new Date(Date.now() - 7 * 86400000) // 7 days ago
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Edge Cases and Boundary Testing', () => {
    test('should handle minimum valid rating (0)', async () => {
      const response = await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 0,
          comment: 'Minimum rating test',
          jobId: job._id
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('newShaktiScore');
      
      const updatedWorker = await Worker.findById(worker._id);
      expect(updatedWorker.shaktiScore).toBeLessThan(worker.shaktiScore);
    });

    test('should handle maximum valid rating (100)', async () => {
      const response = await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 100,
          comment: 'Maximum rating test',
          jobId: job._id
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('newShaktiScore');
      
      const updatedWorker = await Worker.findById(worker._id);
      expect(updatedWorker.shaktiScore).toBeGreaterThan(worker.shaktiScore);
    });

    test('should handle exactly 500 character comment', async () => {
      const exactComment = 'a'.repeat(500);
      const response = await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 75,
          comment: exactComment,
          jobId: job._id
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Complex Rating Scenarios', () => {
    test('should maintain correct ShaktiScore with extreme rating variations', async () => {
      // Create multiple jobs for extreme ratings
      const jobs = [];
      for (let i = 0; i < 5; i++) {
        const newJob = await Job.create({
          title: `Job ${i + 1}`,
          description: 'Test job description',
          location: {
            address: 'Mumbai, Maharashtra',
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
          wage: { amount: 1000, period: 'daily' },
          duration: '7 days',
          startDate: new Date(Date.now() - (i + 2) * 7 * 86400000),
          endDate: new Date(Date.now() - (i + 1) * 7 * 86400000)
        });
        jobs.push(newJob);
      }

      // Extreme rating pattern: [100, 0, 100, 0, 100]
      const ratings = [100, 0, 100, 0, 100];
      const initialScore = worker.shaktiScore;
      
      for (let i = 0; i < ratings.length; i++) {
        const response = await request(app)
          .post(`/ratings/worker/${worker._id}`)
          .set('Authorization', `Bearer ${employerToken}`)
          .send({
            score: ratings[i],
            comment: `Rating ${i + 1}: ${ratings[i]}`,
            jobId: jobs[i]._id
          });

        expect(response.status).toBe(200);
      }

      const finalWorker = await Worker.findById(worker._id);
      expect(finalWorker.totalRatings).toBe(ratings.length);
      expect(finalWorker.ratings).toHaveLength(ratings.length);
    });

    test('should handle concurrent job completions and ratings', async () => {
      // Create multiple jobs completed on the same day
      const sameEndDate = new Date(Date.now() - 86400000);
      const jobs = [];
      
      for (let i = 0; i < 3; i++) {
        const newJob = await Job.create({
          title: `Concurrent Job ${i + 1}`,
          description: 'Test job description',
          location: {
            address: 'Mumbai, Maharashtra',
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
          wage: { amount: 1000, period: 'daily' },
          duration: '1 day',
          startDate: new Date(Date.now() - 2 * 86400000),
          endDate: sameEndDate
        });
        jobs.push(newJob);
      }

      // Rate all jobs concurrently
      const ratings = [85, 90, 95];
      const ratingPromises = jobs.map((job, index) => 
        request(app)
          .post(`/ratings/worker/${worker._id}`)
          .set('Authorization', `Bearer ${employerToken}`)
          .send({
            score: ratings[index],
            comment: `Concurrent rating ${index + 1}`,
            jobId: job._id
          })
      );

      const responses = await Promise.all(ratingPromises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      const finalWorker = await Worker.findById(worker._id);
      expect(finalWorker.totalRatings).toBe(ratings.length);
      expect(finalWorker.ratings).toHaveLength(ratings.length);
    });
  });

  describe('Security and Validation', () => {
    test('should reject rating with invalid job ID format', async () => {
      const response = await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 75,
          comment: 'Test rating',
          jobId: 'invalid-job-id'
        });

      expect(response.status).toBe(400);
    });

    test('should reject rating with missing required fields', async () => {
      const response = await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 75,
          // Missing comment
          jobId: job._id
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Comment is required');
    });

    test('should reject rating with invalid worker ID', async () => {
      const invalidWorkerId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/ratings/worker/${invalidWorkerId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 75,
          comment: 'Test rating',
          jobId: job._id
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Worker not found');
    });
  });
}); 