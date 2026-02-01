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

    // Create test worker
    worker = await Worker.create({
      phone: '+919999999999',
      name: 'Test Worker',
      age: 30,
      skills: ['Plumbing', 'Electrical'],
      experience: 5,
      languages: ['Hindi', 'English']
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

    // Create test job
    job = await Job.create({
      title: 'Test Job',
      description: 'Test job description',
      location: 'Test Location',
      employer: employer._id,
      worker: worker._id,
      status: 'completed',
      skills: ['Plumbing'],
      startDate: new Date(),
      endDate: new Date()
    });

    // Generate employer token
    employerToken = jwt.sign(
      { _id: employer._id.toString(), role: 'employer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Comment Validation', () => {
    test('should reject empty comments', async () => {
      const response = await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 80,
          comment: '',
          jobId: job._id
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Comment is required');
    });

    test('should reject comments longer than 500 characters', async () => {
      const longComment = 'a'.repeat(501);
      const response = await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 80,
          comment: longComment,
          jobId: job._id
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Comment must be less than 500 characters');
    });
  });

  describe('Job Verification', () => {
    test('should reject rating for non-existent job', async () => {
      const fakeJobId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 80,
          comment: 'Good work',
          jobId: fakeJobId
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Job not found');
    });

    test('should reject rating for incomplete job', async () => {
      // Create an incomplete job
      const incompleteJob = await Job.create({
        title: 'Incomplete Job',
        description: 'Test job description',
        location: 'Test Location',
        employer: employer._id,
        worker: worker._id,
        status: 'in_progress',
        skills: ['Plumbing'],
        startDate: new Date()
      });

      const response = await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 80,
          comment: 'Good work',
          jobId: incompleteJob._id
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Cannot rate an incomplete job');
    });
  });

  describe('Duplicate Rating Prevention', () => {
    test('should prevent rating the same job twice', async () => {
      // First rating
      await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 80,
          comment: 'First rating',
          jobId: job._id
        });

      // Second rating for the same job
      const response = await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 90,
          comment: 'Second rating',
          jobId: job._id
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Job has already been rated');
    });
  });

  describe('Rating History', () => {
    test('should store rating history correctly', async () => {
      const ratingData = {
        score: 85,
        comment: 'Excellent work ethic',
        jobId: job._id
      };

      // Submit rating
      await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send(ratingData);

      // Fetch worker and verify rating history
      const updatedWorker = await Worker.findById(worker._id);
      const latestRating = updatedWorker.ratings[0];

      expect(latestRating.score).toBe(ratingData.score);
      expect(latestRating.comment).toBe(ratingData.comment);
      expect(latestRating.employer.toString()).toBe(employer._id.toString());
      expect(latestRating.job.toString()).toBe(job._id.toString());
      expect(latestRating).toHaveProperty('createdAt');
    });

    test('should maintain correct rating order', async () => {
      // Create another completed job
      const secondJob = await Job.create({
        title: 'Second Test Job',
        description: 'Test job description',
        location: 'Test Location',
        employer: employer._id,
        worker: worker._id,
        status: 'completed',
        skills: ['Electrical'],
        startDate: new Date(),
        endDate: new Date()
      });

      // Submit first rating
      await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 75,
          comment: 'First job rating',
          jobId: job._id
        });

      // Submit second rating
      await request(app)
        .post(`/ratings/worker/${worker._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          score: 85,
          comment: 'Second job rating',
          jobId: secondJob._id
        });

      // Verify rating order (most recent first)
      const updatedWorker = await Worker.findById(worker._id);
      expect(updatedWorker.ratings).toHaveLength(2);
      expect(updatedWorker.ratings[0].job.toString()).toBe(secondJob._id.toString());
      expect(updatedWorker.ratings[1].job.toString()).toBe(job._id.toString());
    });
  });
}); 