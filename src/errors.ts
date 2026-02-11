export class AuthError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor(message = "Invalid email or password") {
    super(message, "INVALID_CREDENTIALS", 401);
    this.name = "InvalidCredentialsError";
  }
}

export class UserNotFoundError extends AuthError {
  constructor(message = "User not found") {
    super(message, "USER_NOT_FOUND", 404);
    this.name = "UserNotFoundError";
  }
}

export class UserAlreadyExistsError extends AuthError {
  constructor(message = "A user with this email already exists") {
    super(message, "USER_ALREADY_EXISTS", 409);
    this.name = "UserAlreadyExistsError";
  }
}

export class TokenExpiredError extends AuthError {
  constructor(message = "Token has expired") {
    super(message, "TOKEN_EXPIRED", 401);
    this.name = "TokenExpiredError";
  }
}

export class InvalidTokenError extends AuthError {
  constructor(message = "Invalid token") {
    super(message, "INVALID_TOKEN", 401);
    this.name = "InvalidTokenError";
  }
}

export class RateLimitExceededError extends AuthError {
  constructor(message = "Too many requests, please try again later") {
    super(message, "RATE_LIMIT_EXCEEDED", 429);
    this.name = "RateLimitExceededError";
  }
}

export class AccountLockedError extends AuthError {
  constructor(message = "Account is temporarily locked due to too many failed attempts") {
    super(message, "ACCOUNT_LOCKED", 423);
    this.name = "AccountLockedError";
  }
}

export class MfaRequiredError extends AuthError {
  constructor(message = "Multi-factor authentication token is required") {
    super(message, "MFA_REQUIRED", 403);
    this.name = "MfaRequiredError";
  }
}

export class InvalidMfaTokenError extends AuthError {
  constructor(message = "Invalid MFA token") {
    super(message, "INVALID_MFA_TOKEN", 401);
    this.name = "InvalidMfaTokenError";
  }
}

export class ValidationError extends AuthError {
  public readonly field: string;

  constructor(message: string, field: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
    this.field = field;
  }
}

export class PasswordPolicyError extends AuthError {
  public readonly requirements: string[];

  constructor(message: string, requirements: string[]) {
    super(message, "PASSWORD_POLICY_ERROR", 400);
    this.name = "PasswordPolicyError";
    this.requirements = requirements;
  }
}
