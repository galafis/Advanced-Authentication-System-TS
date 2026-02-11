export { AuthService } from "./services/auth.service";
export { TokenService } from "./services/token.service";
export { PasswordService } from "./services/password.service";
export { MfaService } from "./services/mfa.service";
export { InMemoryUserStore } from "./services/user.store";

export { RateLimiter } from "./utils/rate-limiter";
export { validateEmail, validatePassword, sanitizeEmail } from "./utils/validation";

export { createConfig } from "./config";

export {
  AuthError,
  InvalidCredentialsError,
  UserNotFoundError,
  UserAlreadyExistsError,
  TokenExpiredError,
  InvalidTokenError,
  RateLimitExceededError,
  AccountLockedError,
  MfaRequiredError,
  InvalidMfaTokenError,
  ValidationError,
  PasswordPolicyError,
} from "./errors";

export type {
  User,
  TokenPair,
  AccessTokenPayload,
  RefreshTokenPayload,
  AuthResult,
  MfaSetupResult,
  PublicUser,
  RegisterInput,
  LoginInput,
  AuthConfig,
  UserStore,
} from "./types";
