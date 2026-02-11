import { validateEmail, validatePassword, sanitizeEmail } from "../validation";
import { ValidationError, PasswordPolicyError } from "../../errors";

describe("validateEmail", () => {
  it("should accept valid emails", () => {
    expect(() => validateEmail("test@example.com")).not.toThrow();
    expect(() => validateEmail("user.name+tag@domain.co")).not.toThrow();
    expect(() => validateEmail("a@b.cd")).not.toThrow();
  });

  it("should reject empty email", () => {
    expect(() => validateEmail("")).toThrow(ValidationError);
    expect(() => validateEmail("   ")).toThrow(ValidationError);
  });

  it("should reject invalid format", () => {
    expect(() => validateEmail("not-an-email")).toThrow(ValidationError);
    expect(() => validateEmail("@domain.com")).toThrow(ValidationError);
    expect(() => validateEmail("user@")).toThrow(ValidationError);
    expect(() => validateEmail("user@.com")).toThrow(ValidationError);
  });
});

describe("validatePassword", () => {
  const config = {
    saltRounds: 12,
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  };

  it("should accept strong passwords", () => {
    expect(() => validatePassword("SecureP@ss1!", config)).not.toThrow();
    expect(() => validatePassword("MyP4$$w0rd!", config)).not.toThrow();
  });

  it("should reject short passwords", () => {
    expect(() => validatePassword("Sh0r!", config)).toThrow(PasswordPolicyError);
  });

  it("should reject passwords missing uppercase", () => {
    expect(() => validatePassword("securep@ss1!", config)).toThrow(PasswordPolicyError);
  });

  it("should reject passwords missing lowercase", () => {
    expect(() => validatePassword("SECUREP@SS1!", config)).toThrow(PasswordPolicyError);
  });

  it("should reject passwords missing numbers", () => {
    expect(() => validatePassword("SecureP@ss!!", config)).toThrow(PasswordPolicyError);
  });

  it("should reject passwords missing special chars", () => {
    expect(() => validatePassword("SecurePass1a", config)).toThrow(PasswordPolicyError);
  });

  it("should include all failures in error", () => {
    try {
      validatePassword("a", config);
    } catch (e) {
      expect(e).toBeInstanceOf(PasswordPolicyError);
      const err = e as PasswordPolicyError;
      expect(err.requirements.length).toBeGreaterThan(0);
    }
  });
});

describe("sanitizeEmail", () => {
  it("should lowercase and trim", () => {
    expect(sanitizeEmail("  TEST@EXAMPLE.COM  ")).toBe("test@example.com");
    expect(sanitizeEmail("User@Domain.COM")).toBe("user@domain.com");
  });
});
