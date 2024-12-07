
class RateLimiter {
  constructor(redisClient, keyPrefix, tokensPerMinute, bucketCapacity, tokensRequired = 1) {
    this.redis = redisClient;
    this.keyPrefix = keyPrefix;
    this.tokensPerMinute = tokensPerMinute;
    this.bucketCapacity = bucketCapacity;
    this.tokensRequired = tokensRequired;
  }

  getBucketKey(clientId) {
    return `${this.keyPrefix}:${clientId}`;
  }

  async allowRequest(clientId) {
    const bucketKey = this.getBucketKey(clientId);
    const currentTime = Date.now() / (1000 * 60); // minutes

    const results = await this.redis
      .multi()
      .hmget(bucketKey, 'lastRefill', 'tokens')
      .expire(bucketKey, 120) // ttl 2 minutes
      .exec()

    
    const [hmgetError, hmgetResult] = results[0]; // hmget result: ['lastRefillValue','tokensValue']
    const [expireError, expireResult] = results[1]; // expire result: 1 or 0

    const [lastRefill, tokens] = hmgetResult;

    let lastRefillTime =  parseFloat(lastRefill) || currentTime;
    let availableTokens = tokens !== '0' ? parseInt(tokens) || this.bucketCapacity : 0

    const timePassed = currentTime - lastRefillTime;
    const tokensToAdd = parseInt(timePassed * this.tokensPerMinute);
    const newTokens = Math.min(this.bucketCapacity, availableTokens + tokensToAdd);
    
    if (newTokens >= this.tokensRequired) {
      await this.redis.hmset(bucketKey, {
        lastRefill: currentTime, // timestamp of last refill
        tokens: newTokens - this.tokensRequired // capacity
      });
      return true;
    } else {
      await this.redis.hmset(bucketKey, {
        lastRefill: currentTime, // timestamp of last refill
        tokens: newTokens // capacity
      });
      return false;
    }
  }
}

module.exports = RateLimiter;
