import { AuthConfig } from "./types";

const DEFAULT_CONFIG: AuthConfig = {
  jwt: {
    accessTokenSecret: "change-this-access-secret-in-production",
    refreshTokenSecret: "change-this-refresh-secret-in-production",
    accessTokenExpiresIn: 900,
    refreshTokenExpiresIn: 604800,
    issuer: "advanced-auth-system",
  },
  password: {
    saltRounds: 12,
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
  rateLimit: {
    maxAttempts: 10,
    windowMs: 60000,
  },
  account: {
    maxFailedAttempts: 5,
    lockoutDurationMs: 900000,
  },
};

export function createConfig(overrides?: DeepPartial<AuthConfig>): AuthConfig {
  if (!overrides) {
    return { ...DEFAULT_CONFIG };
  }

  return {
    jwt: { ...DEFAULT_CONFIG.jwt, ...overrides.jwt },
    password: { ...DEFAULT_CONFIG.password, ...overrides.password },
    rateLimit: { ...DEFAULT_CONFIG.rateLimit, ...overrides.rateLimit },
    account: { ...DEFAULT_CONFIG.account, ...overrides.account },
  };
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
