const { Queue } = require("bullmq");

const getConnection = () => {
  if (process.env.REDIS_URL) {
    const redisUrl = new URL(process.env.REDIS_URL);
    if (!["redis:", "rediss:"].includes(redisUrl.protocol)) {
      throw new Error("REDIS_URL must use the redis:// or rediss:// protocol");
    }
    return {
      host: redisUrl.hostname,
      port: Number(redisUrl.port || 6379),
      ...(redisUrl.username ? { username: decodeURIComponent(redisUrl.username) } : {}),
      ...(redisUrl.password ? { password: decodeURIComponent(redisUrl.password) } : {}),
      ...(redisUrl.pathname.length > 1
        ? { db: Number(redisUrl.pathname.slice(1)) }
        : {}),
      ...(redisUrl.protocol === "rediss:" ? { tls: {} } : {}),
    };
  }
  return {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
    ...(process.env.REDIS_PASSWORD
      ? { password: process.env.REDIS_PASSWORD }
      : {}),
  };
};

const connection = getConnection();

const scanQueue = new Queue("api-security-scans", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

module.exports = { connection, scanQueue };