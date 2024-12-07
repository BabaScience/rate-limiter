const express = require('express');
const Redis = require('ioredis');
const RateLimiter = require('./RateLimiter');

const app = express();
const redis = new Redis();

const X_RateLimit_Limit = 5;
const X_RateLimit_Retry_After = 120;
const X_RateLimit_Remaining = 0;
const KeyPrefix = 'api_rate_limit';

const rateLimiter = new RateLimiter(redis, KeyPrefix, X_RateLimit_Limit, X_RateLimit_Limit);

// Middleware for rate limiting
app.use(async (req, res, next) => {
  const clientId = req.headers['x-api-key'] || req.ip;
  
  try {
    const allowed = await rateLimiter.allowRequest(clientId);
    if (allowed) {
      next();
    } else {
      res.header('X-RateLimit-Limit', X_RateLimit_Limit)
          .header('X-RateLimit-Remaining', X_RateLimit_Remaining)
          .header('X-RateLimit-Retry-After', X_RateLimit_Retry_After)
          .status(429).json({ error: 'Rate limit exceeded' });
    }
  } catch (error) {
    console.error('Rate limiting error:', error);
    next()
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
