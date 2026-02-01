const express = require('express');
const cors = require('cors');

// Simple test server to verify API connectivity
const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  console.log('✅ Test endpoint hit');
  res.json({ 
    success: true, 
    message: 'Backend API is working!',
    timestamp: new Date().toISOString()
  });
});

// Test employer endpoint
app.get('/api/employers/test', (req, res) => {
  console.log('✅ Employer test endpoint hit');
  res.json({
    success: true,
    message: 'Employer API endpoint is accessible',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📡 Test URL: http://localhost:${PORT}/api/test`);
  console.log(`📡 Employer Test URL: http://localhost:${PORT}/api/employers/test`);
}); 