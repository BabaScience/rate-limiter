
class RateLimiter {
  constructor(redisClient, keyPrefix, tokensPerSecond, bucketCapacity) {
    this.redis = redisClient;
    this.keyPrefix = keyPrefix;
    this.tokensPerSecond = tokensPerSecond;
    this.bucketCapacity = bucketCapacity;
  }

  getBucketKey(clientId) {
    return `${this.keyPrefix}:${clientId}`;
  }

  async allowRequest(clientId, tokensRequired = 1) {
    const bucketKey = this.getBucketKey(clientId);
    const currentTime = Date.now() / 1000;

    const [lastRefill, tokens] = await this.redis
      .multi()
      .hmget(bucketKey, 'lastRefill', 'tokens')
      .expire(bucketKey, 60)
      .exec();

    let lastRefillTime = parseFloat(lastRefill[1]) || currentTime;
    let availableTokens = parseInt(tokens[1]) || this.bucketCapacity;

    const timePassed = currentTime - lastRefillTime;
    const tokensToAdd = timePassed * this.tokensPerSecond;
    const newTokens = Math.min(this.bucketCapacity, availableTokens + tokensToAdd);

    if (newTokens >= tokensRequired) {
      await this.redis.hmset(bucketKey, {
        lastRefill: currentTime,
        tokens: newTokens - tokensRequired
      });
      return true;
    } else {
      await this.redis.hmset(bucketKey, {
        lastRefill: currentTime,
        tokens: newTokens
      });
      return false;
    }
  }
}

module.exports = RateLimiter;
