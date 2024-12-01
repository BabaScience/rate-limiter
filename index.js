const express = require('express');
const Redis = require('ioredis');
const RateLimiter = require('./RateLimiter');

const app = express();
const redis = new Redis();

const rateLimiter = new RateLimiter(redis, 'api_rate_limit', 10, 3);

// Middleware for rate limiting
app.use(async (req, res, next) => {
  const clientId = req.headers['x-api-key'] || req.ip;
  
  try {
    const allowed = await rateLimiter.allowRequest(clientId);
    if (allowed) {
      next();
    } else {
      res.status(429).json({ error: 'Rate limit exceeded' });
    }
  } catch (error) {
    console.error('Rate limiting error:', error);
    next(); // Proceed without rate limiting in case of an error
  }
});

// Sample API route
app.get('/api/resource', (req, res) => {
  res.json({ message: 'API resource accessed successfully' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
