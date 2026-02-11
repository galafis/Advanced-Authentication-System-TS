export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  mfaEnabled: boolean;
  mfaSecret: string | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  roles: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
  type: "access";
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  type: "refresh";
  jti: string;
  iat: number;
  exp: number;
}

export interface AuthResult {
  user: PublicUser;
  tokens: TokenPair;
}

export interface MfaSetupResult {
  secret: string;
  otpauthUrl: string;
}

export interface PublicUser {
  id: string;
  email: string;
  roles: string[];
  mfaEnabled: boolean;
  createdAt: Date;
}

export interface RegisterInput {
  email: string;
  password: string;
  roles?: string[];
}

export interface LoginInput {
  email: string;
  password: string;
  mfaToken?: string;
}

export interface AuthConfig {
  jwt: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenExpiresIn: number;
    refreshTokenExpiresIn: number;
    issuer: string;
  };
  password: {
    saltRounds: number;
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  rateLimit: {
    maxAttempts: number;
    windowMs: number;
  };
  account: {
    maxFailedAttempts: number;
    lockoutDurationMs: number;
  };
}

export interface UserStore {
  create(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: string, updates: Partial<User>): Promise<User>;
  delete(id: string): Promise<boolean>;
}
