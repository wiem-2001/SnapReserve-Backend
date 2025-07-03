import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Test database connection
router.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      success: true,
      message: 'Database connection successful!',
      time: result.rows[0].now
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

export default router;