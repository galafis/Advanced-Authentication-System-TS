import { MfaService } from "../mfa.service";

describe("MfaService", () => {
  let service: MfaService;

  beforeEach(() => {
    service = new MfaService("test-auth");
  });

  describe("generateSecret", () => {
    it("should generate a base32-encoded secret", () => {
      const secret = service.generateSecret();
      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThan(0);
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
    });

    it("should generate unique secrets", () => {
      const s1 = service.generateSecret();
      const s2 = service.generateSecret();
      expect(s1).not.toBe(s2);
    });
  });

  describe("generateOtpauthUrl", () => {
    it("should generate a valid otpauth URL", () => {
      const secret = service.generateSecret();
      const url = service.generateOtpauthUrl(secret, "user@example.com");
      expect(url).toContain("otpauth://totp/");
      expect(url).toContain("test-auth");
      expect(url).toContain("user%40example.com");
      expect(url).toContain(`secret=${secret}`);
      expect(url).toContain("algorithm=SHA1");
      expect(url).toContain("digits=6");
      expect(url).toContain("period=30");
    });
  });

  describe("verifyToken", () => {
    it("should verify a valid token generated for the same secret", () => {
      const secret = service.generateSecret();
      const token = service.generateCurrentToken(secret);
      expect(service.verifyToken(secret, token)).toBe(true);
    });

    it("should reject invalid token format", () => {
      const secret = service.generateSecret();
      expect(service.verifyToken(secret, "")).toBe(false);
      expect(service.verifyToken(secret, "abc")).toBe(false);
      expect(service.verifyToken(secret, "12345")).toBe(false);
      expect(service.verifyToken(secret, "1234567")).toBe(false);
    });

    it("should reject wrong token", () => {
      const secret1 = service.generateSecret();
      const secret2 = service.generateSecret();
      const token = service.generateCurrentToken(secret1);
      expect(service.verifyToken(secret2, token)).toBe(false);
    });
  });

  describe("generateCurrentToken", () => {
    it("should generate a 6-digit token", () => {
      const secret = service.generateSecret();
      const token = service.generateCurrentToken(secret);
      expect(token).toMatch(/^\d{6}$/);
    });
  });
});
