import { PasswordService } from "../password.service";

describe("PasswordService", () => {
  const service = new PasswordService({ saltRounds: 4, minLength: 8, requireUppercase: true, requireLowercase: true, requireNumbers: true, requireSpecialChars: true });

  describe("hash", () => {
    it("should hash a password", async () => {
      const hash = await service.hash("TestPassword123!");
      expect(hash).toBeDefined();
      expect(hash).not.toBe("TestPassword123!");
      expect(hash.startsWith("$2")).toBe(true);
    });

    it("should produce different hashes for same password", async () => {
      const hash1 = await service.hash("TestPassword123!");
      const hash2 = await service.hash("TestPassword123!");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verify", () => {
    it("should return true for correct password", async () => {
      const hash = await service.hash("TestPassword123!");
      const result = await service.verify("TestPassword123!", hash);
      expect(result).toBe(true);
    });

    it("should return false for incorrect password", async () => {
      const hash = await service.hash("TestPassword123!");
      const result = await service.verify("WrongPassword!", hash);
      expect(result).toBe(false);
    });
  });
});
