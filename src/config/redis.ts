import Redis from "ioredis";

export const pub = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

export const sub = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

pub.on("error", (err) => {
  console.error("Redis Publisher Error:", err);
});

sub.on("error", (err) => {
  console.error("Redis Subscriber Error:", err);
});
