import crypto from "crypto";
import {
  AuthConfig,
  AuthResult,
  LoginInput,
  MfaSetupResult,
  PublicUser,
  RegisterInput,
  TokenPair,
  User,
  UserStore,
} from "../types";
import {
  AccountLockedError,
  InvalidCredentialsError,
  InvalidMfaTokenError,
  MfaRequiredError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from "../errors";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";
import { MfaService } from "./mfa.service";
import { RateLimiter } from "../utils/rate-limiter";
import { validateEmail, validatePassword, sanitizeEmail } from "../utils/validation";

export class AuthService {
  private readonly userStore: UserStore;
  private readonly passwordService: PasswordService;
  private readonly tokenService: TokenService;
  private readonly mfaService: MfaService;
  private readonly rateLimiter: RateLimiter;
  private readonly config: AuthConfig;
  private readonly userRefreshTokens: Map<string, Set<string>> = new Map();

  constructor(config: AuthConfig, userStore: UserStore) {
    this.config = config;
    this.userStore = userStore;
    this.passwordService = new PasswordService(config.password);
    this.tokenService = new TokenService(config.jwt);
    this.mfaService = new MfaService(config.jwt.issuer);
    this.rateLimiter = new RateLimiter(
      config.rateLimit.maxAttempts,
      config.rateLimit.windowMs
    );
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const email = sanitizeEmail(input.email);
    validateEmail(email);
    validatePassword(input.password, this.config.password);

    const existing = await this.userStore.findByEmail(email);
    if (existing) {
      throw new UserAlreadyExistsError();
    }

    const passwordHash = await this.passwordService.hash(input.password);
    const now = new Date();

    const user: User = {
      id: crypto.randomUUID(),
      email,
      passwordHash,
      createdAt: now,
      updatedAt: now,
      mfaEnabled: false,
      mfaSecret: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      roles: input.roles ?? ["user"],
    };

    const created = await this.userStore.create(user);
    const tokens = this.tokenService.generateTokenPair(
      created.id,
      created.email,
      created.roles
    );
    this.trackRefreshToken(created.id, tokens.refreshToken);

    return {
      user: this.toPublicUser(created),
      tokens,
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const email = sanitizeEmail(input.email);
    this.rateLimiter.check(email);
    this.rateLimiter.record(email);

    const user = await this.userStore.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    this.checkAccountLock(user);

    const isValidPassword = await this.passwordService.verify(
      input.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      await this.handleFailedLogin(user);
      throw new InvalidCredentialsError();
    }

    if (user.mfaEnabled) {
      if (!input.mfaToken) {
        throw new MfaRequiredError();
      }
      if (!user.mfaSecret || !this.mfaService.verifyToken(user.mfaSecret, input.mfaToken)) {
        throw new InvalidMfaTokenError();
      }
    }

    await this.handleSuccessfulLogin(user);
    this.rateLimiter.reset(email);

    const tokens = this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.roles
    );
    this.trackRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.toPublicUser(user),
      tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);

    const user = await this.userStore.findById(payload.sub);
    if (!user) {
      throw new UserNotFoundError();
    }

    this.tokenService.revokeRefreshToken(refreshToken);
    this.untrackRefreshToken(user.id, refreshToken);

    const tokens = this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.roles
    );
    this.trackRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  verifyAccessToken(accessToken: string): { userId: string; email: string; roles: string[] } {
    const payload = this.tokenService.verifyAccessToken(accessToken);
    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);
      this.untrackRefreshToken(payload.sub, refreshToken);
    } catch {
      // Token may already be invalid
    }
    this.tokenService.revokeRefreshToken(refreshToken);
  }

  async logoutAll(userId: string): Promise<void> {
    const tokens = this.userRefreshTokens.get(userId);
    if (tokens) {
      this.tokenService.revokeAllUserTokens(Array.from(tokens));
      this.userRefreshTokens.delete(userId);
    }
  }

  async setupMfa(userId: string): Promise<MfaSetupResult> {
    const user = await this.userStore.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const secret = this.mfaService.generateSecret();
    const otpauthUrl = this.mfaService.generateOtpauthUrl(secret, user.email);

    await this.userStore.update(userId, { mfaSecret: secret });

    return { secret, otpauthUrl };
  }

  async enableMfa(userId: string, token: string): Promise<void> {
    const user = await this.userStore.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    if (!user.mfaSecret) {
      throw new InvalidMfaTokenError("MFA has not been set up. Call setupMfa first.");
    }

    if (!this.mfaService.verifyToken(user.mfaSecret, token)) {
      throw new InvalidMfaTokenError("Invalid MFA token. Please try again.");
    }

    await this.userStore.update(userId, { mfaEnabled: true });
  }

  async disableMfa(userId: string, password: string): Promise<void> {
    const user = await this.userStore.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const isValid = await this.passwordService.verify(password, user.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError("Invalid password");
    }

    await this.userStore.update(userId, {
      mfaEnabled: false,
      mfaSecret: null,
    });
  }

  async getUser(userId: string): Promise<PublicUser> {
    const user = await this.userStore.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    return this.toPublicUser(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.userStore.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const isValid = await this.passwordService.verify(
      currentPassword,
      user.passwordHash
    );
    if (!isValid) {
      throw new InvalidCredentialsError("Current password is incorrect");
    }

    validatePassword(newPassword, this.config.password);
    const newHash = await this.passwordService.hash(newPassword);
    await this.userStore.update(userId, { passwordHash: newHash });

    await this.logoutAll(userId);
  }

  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await this.userStore.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const isValid = await this.passwordService.verify(password, user.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError("Invalid password");
    }

    await this.logoutAll(userId);
    await this.userStore.delete(userId);
  }

  destroy(): void {
    this.rateLimiter.destroy();
    this.userRefreshTokens.clear();
  }

  private checkAccountLock(user: User): void {
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new AccountLockedError(
        `Account is locked. Try again in ${remainingMin} minute(s).`
      );
    }
  }

  private async handleFailedLogin(user: User): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;
    const updates: Partial<User> = { failedLoginAttempts: attempts };

    if (attempts >= this.config.account.maxFailedAttempts) {
      updates.lockedUntil = new Date(
        Date.now() + this.config.account.lockoutDurationMs
      );
      updates.failedLoginAttempts = 0;
    }

    await this.userStore.update(user.id, updates);
  }

  private async handleSuccessfulLogin(user: User): Promise<void> {
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.userStore.update(user.id, {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
    }
  }

  private trackRefreshToken(userId: string, token: string): void {
    let tokens = this.userRefreshTokens.get(userId);
    if (!tokens) {
      tokens = new Set();
      this.userRefreshTokens.set(userId, tokens);
    }
    tokens.add(token);
  }

  private untrackRefreshToken(userId: string, token: string): void {
    const tokens = this.userRefreshTokens.get(userId);
    if (tokens) {
      tokens.delete(token);
      if (tokens.size === 0) {
        this.userRefreshTokens.delete(userId);
      }
    }
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
    };
  }
}
