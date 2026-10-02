import redisClient from "../../core/database/redis.js";

const WINDOW_SECONDS = 5 * 60;

const IP_MAX_ATTEMPTS = 20;
const EMAIL_MAX_ATTEMPTS = 10;

const getIpKey = (ip) => `bms:login:ip:${ip}`;

const getEmailKey = (email) =>
  `bms:login:email:${email.toLowerCase().trim()}`;

/**
 * Check whether login attempts are allowed.
 */
export const checkLoginRateLimit = async ({ ip, email }) => {
  const ipKey = getIpKey(ip);
  const emailKey = getEmailKey(email);

  const [ipAttempts, emailAttempts] = await Promise.all([
    redisClient.get(ipKey),
    redisClient.get(emailKey),
  ]);

  if (Number(ipAttempts) > IP_MAX_ATTEMPTS) {
    return {
      allowed: false,
      reason: "IP_LIMIT",
    };
  }

  if (Number(emailAttempts) > EMAIL_MAX_ATTEMPTS) {
    return {
      allowed: false,
      reason: "EMAIL_LIMIT",
    };
  }

  return {
    allowed: true,
  };
};

/**
 * Record a failed login attempt.
 */
export const recordFailedLogin = async ({ ip, email }) => {
  const ipKey = getIpKey(ip);
  const emailKey = getEmailKey(email);

  const [, , ipTtl, emailTtl] = await Promise.all([
    redisClient.incr(ipKey),
    redisClient.incr(emailKey),
    redisClient.ttl(ipKey),
    redisClient.ttl(emailKey),
  ]);

  if (ipTtl === -1) {
    await redisClient.expire(ipKey, WINDOW_SECONDS);
  }

  if (emailTtl === -1) {
    await redisClient.expire(emailKey, WINDOW_SECONDS);
  }
};

/**
 * Clear login rate limits after successful login.
 */
export const resetLoginRateLimit = async ({ ip, email }) => {
  const ipKey = getIpKey(ip);
  const emailKey = getEmailKey(email);

  await Promise.all([
    redisClient.del(ipKey),
    redisClient.del(emailKey),
  ]);
};