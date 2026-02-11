import { AuthConfig } from "../types";
import { ValidationError, PasswordPolicyError } from "../errors";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function validateEmail(email: string): void {
  if (!email || typeof email !== "string") {
    throw new ValidationError("Email is required", "email");
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length === 0) {
    throw new ValidationError("Email is required", "email");
  }

  if (trimmed.length > 254) {
    throw new ValidationError("Email address is too long", "email");
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    throw new ValidationError("Invalid email format", "email");
  }
}

export function validatePassword(
  password: string,
  config: AuthConfig["password"]
): void {
  if (!password || typeof password !== "string") {
    throw new ValidationError("Password is required", "password");
  }

  const failures: string[] = [];

  if (password.length < config.minLength) {
    failures.push(`at least ${config.minLength} characters`);
  }

  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    failures.push("at least one uppercase letter");
  }

  if (config.requireLowercase && !/[a-z]/.test(password)) {
    failures.push("at least one lowercase letter");
  }

  if (config.requireNumbers && !/[0-9]/.test(password)) {
    failures.push("at least one number");
  }

  if (config.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    failures.push("at least one special character");
  }

  if (failures.length > 0) {
    throw new PasswordPolicyError(
      `Password must contain: ${failures.join(", ")}`,
      failures
    );
  }
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
