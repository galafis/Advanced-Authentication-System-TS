import { RateLimiter } from "../rate-limiter";
import { RateLimitExceededError } from "../../errors";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(3, 60000);
  });

  afterEach(() => {
    limiter.destroy();
  });

  it("should allow requests under the limit", () => {
    expect(() => limiter.check("user1")).not.toThrow();
    limiter.record("user1");
    expect(() => limiter.check("user1")).not.toThrow();
    limiter.record("user1");
    expect(() => limiter.check("user1")).not.toThrow();
  });

  it("should block requests over the limit", () => {
    limiter.record("user1");
    limiter.record("user1");
    limiter.record("user1");
    expect(() => limiter.check("user1")).toThrow(RateLimitExceededError);
  });

  it("should track different keys independently", () => {
    limiter.record("user1");
    limiter.record("user1");
    limiter.record("user1");
    expect(() => limiter.check("user1")).toThrow(RateLimitExceededError);
    expect(() => limiter.check("user2")).not.toThrow();
  });

  it("should reset a specific key", () => {
    limiter.record("user1");
    limiter.record("user1");
    limiter.record("user1");
    limiter.reset("user1");
    expect(() => limiter.check("user1")).not.toThrow();
  });

  it("should return remaining attempts", () => {
    expect(limiter.getRemainingAttempts("user1")).toBe(3);
    limiter.record("user1");
    expect(limiter.getRemainingAttempts("user1")).toBe(2);
    limiter.record("user1");
    expect(limiter.getRemainingAttempts("user1")).toBe(1);
    limiter.record("user1");
    expect(limiter.getRemainingAttempts("user1")).toBe(0);
  });

  it("should expire entries after window", async () => {
    const shortLimiter = new RateLimiter(1, 100);
    shortLimiter.record("user1");
    expect(() => shortLimiter.check("user1")).toThrow(RateLimitExceededError);

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(() => shortLimiter.check("user1")).not.toThrow();
    shortLimiter.destroy();
  });
});
