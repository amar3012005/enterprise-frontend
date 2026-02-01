const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const status = {
      mongodb: dbState === 1 ? 'connected' : 'disconnected',
      server: 'running'
    };

    if (dbState === 1) {
      res.json({ status, success: true });
    } else {
      res.status(503).json({
        status,
        success: false,
        message: 'Database not connected'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
