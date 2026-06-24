// Lightweight in-memory rate limiter (no external dependency).
// Suitable for a single-process PM2 fork deployment. If the app is ever
// scaled to multiple instances, move this to a shared store (Redis).

const createRateLimiter = ({ windowMs, max, message }) => {
  const hits = new Map(); // key -> { count, resetAt }

  // Periodically drop expired buckets so the map does not grow unbounded.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  if (sweep.unref) sweep.unref();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.connection?.remoteAddress || 'unknown';
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: message || 'มีคำขอมากเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง',
      });
    }

    next();
  };
};

module.exports = { createRateLimiter };
