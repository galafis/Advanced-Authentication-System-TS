import { AuthService } from "../auth.service";
import { InMemoryUserStore } from "../user.store";
import { MfaService } from "../mfa.service";
import { createConfig } from "../../config";
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
  MfaRequiredError,
  InvalidMfaTokenError,
  UserNotFoundError,
  AccountLockedError,
  ValidationError,
  PasswordPolicyError,
} from "../../errors";

const config = createConfig({
  jwt: {
    accessTokenSecret: "test-access-secret",
    refreshTokenSecret: "test-refresh-secret",
    accessTokenExpiresIn: 900,
    refreshTokenExpiresIn: 604800,
  },
  password: {
    saltRounds: 4,
    minLength: 8,
  },
  account: {
    maxFailedAttempts: 3,
    lockoutDurationMs: 60000,
  },
});

describe("AuthService", () => {
  let authService: AuthService;
  let userStore: InMemoryUserStore;

  beforeEach(() => {
    userStore = new InMemoryUserStore();
    authService = new AuthService(config, userStore);
  });

  afterEach(() => {
    authService.destroy();
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const result = await authService.register({
        email: "test@example.com",
        password: "SecureP@ss1!",
      });

      expect(result.user.email).toBe("test@example.com");
      expect(result.user.roles).toEqual(["user"]);
      expect(result.user.mfaEnabled).toBe(false);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it("should register with custom roles", async () => {
      const result = await authService.register({
        email: "admin@example.com",
        password: "SecureP@ss1!",
        roles: ["admin", "user"],
      });

      expect(result.user.roles).toEqual(["admin", "user"]);
    });

    it("should reject duplicate email", async () => {
      await authService.register({
        email: "test@example.com",
        password: "SecureP@ss1!",
      });

      await expect(
        authService.register({
          email: "test@example.com",
          password: "SecureP@ss1!",
        })
      ).rejects.toThrow(UserAlreadyExistsError);
    });

    it("should normalize email to lowercase", async () => {
      const result = await authService.register({
        email: "TEST@EXAMPLE.COM",
        password: "SecureP@ss1!",
      });

      expect(result.user.email).toBe("test@example.com");
    });

    it("should reject invalid email", async () => {
      await expect(
        authService.register({
          email: "not-an-email",
          password: "SecureP@ss1!",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should reject weak password", async () => {
      await expect(
        authService.register({
          email: "test@example.com",
          password: "short",
        })
      ).rejects.toThrow(PasswordPolicyError);
    });
  });

  describe("login", () => {
    beforeEach(async () => {
      await authService.register({
        email: "test@example.com",
        password: "SecureP@ss1!",
      });
    });

    it("should login with valid credentials", async () => {
      const result = await authService.login({
        email: "test@example.com",
        password: "SecureP@ss1!",
      });

      expect(result.user.email).toBe("test@example.com");
      expect(result.tokens.accessToken).toBeDefined();
    });

    it("should reject wrong password", async () => {
      await expect(
        authService.login({
          email: "test@example.com",
          password: "WrongP@ss1!",
        })
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it("should reject non-existent email", async () => {
      await expect(
        authService.login({
          email: "nobody@example.com",
          password: "SecureP@ss1!",
        })
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it("should lock account after max failed attempts", async () => {
      for (let i = 0; i < 3; i++) {
        await expect(
          authService.login({
            email: "test@example.com",
            password: "WrongP@ss1!",
          })
        ).rejects.toThrow(InvalidCredentialsError);
      }

      await expect(
        authService.login({
          email: "test@example.com",
          password: "SecureP@ss1!",
        })
      ).rejects.toThrow(AccountLockedError);
    });
  });

  describe("token management", () => {
    it("should verify a valid access token", async () => {
      const result = await authService.register({
        email: "test@example.com",
        password: "SecureP@ss1!",
      });

      const verified = authService.verifyAccessToken(result.tokens.accessToken);
      expect(verified.email).toBe("test@example.com");
      expect(verified.userId).toBe(result.user.id);
    });

    it("should refresh tokens and revoke old refresh token", async () => {
      const result = await authService.register({
        email: "test@example.com",
        password: "SecureP@ss1!",
      });

      const newTokens = await authService.refreshTokens(result.tokens.refreshToken);
      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.refreshToken).not.toBe(result.tokens.refreshToken);

      await expect(
        authService.refreshTokens(result.tokens.refreshToken)
      ).rejects.toThrow();
    });
  });

  describe("logout", () => {
    it("should logout and revoke refresh token", async () => {
      const result = await authService.register({
        email: "test@example.com",
        password: "SecureP@ss1!",
      });

      await authService.logout(result.tokens.refreshToken);

      await expect(
        authService.refreshTokens(result.tokens.refreshToken)
      ).rejects.toThrow();
    });

    it("should logout all sessions", async () => {
      const result = await authService.register({
        email: "test@example.com",
        password: "SecureP@ss1!",
      });

      await authService.logoutAll(result.user.id);

      await expect(
        authService.refreshTokens(result.tokens.refreshToken)
      ).rejects.toThrow();
    });
  });

  describe("MFA", () => {
    let userId: string;

    beforeEach(async () => {
      const result = await authService.register({
        email: "mfa@example.com",
        password: "SecureP@ss1!",
      });
      userId = result.user.id;
    });

    it("should setup MFA and return secret + otpauth URL", async () => {
      const setup = await authService.setupMfa(userId);
      expect(setup.secret).toBeDefined();
      expect(setup.otpauthUrl).toContain("otpauth://totp/");
    });

    it("should enable MFA with valid token", async () => {
      const setup = await authService.setupMfa(userId);
      const mfaService = new MfaService(config.jwt.issuer);
      const token = mfaService.generateCurrentToken(setup.secret);

      await authService.enableMfa(userId, token);
      const user = await authService.getUser(userId);
      expect(user.mfaEnabled).toBe(true);
    });

    it("should reject enable MFA with invalid token", async () => {
      await authService.setupMfa(userId);
      await expect(authService.enableMfa(userId, "000000")).rejects.toThrow(InvalidMfaTokenError);
    });

    it("should require MFA token on login when MFA is enabled", async () => {
      const setup = await authService.setupMfa(userId);
      const mfaService = new MfaService(config.jwt.issuer);
      const token = mfaService.generateCurrentToken(setup.secret);
      await authService.enableMfa(userId, token);

      await expect(
        authService.login({
          email: "mfa@example.com",
          password: "SecureP@ss1!",
        })
      ).rejects.toThrow(MfaRequiredError);
    });

    it("should login with valid MFA token", async () => {
      const setup = await authService.setupMfa(userId);
      const mfaService = new MfaService(config.jwt.issuer);
      const token = mfaService.generateCurrentToken(setup.secret);
      await authService.enableMfa(userId, token);

      const loginToken = mfaService.generateCurrentToken(setup.secret);
      const result = await authService.login({
        email: "mfa@example.com",
        password: "SecureP@ss1!",
        mfaToken: loginToken,
      });
      expect(result.user.email).toBe("mfa@example.com");
    });

    it("should disable MFA with valid password", async () => {
      const setup = await authService.setupMfa(userId);
      const mfaService = new MfaService(config.jwt.issuer);
      const token = mfaService.generateCurrentToken(setup.secret);
      await authService.enableMfa(userId, token);

      await authService.disableMfa(userId, "SecureP@ss1!");
      const user = await authService.getUser(userId);
      expect(user.mfaEnabled).toBe(false);
    });
  });

  describe("changePassword", () => {
    it("should change password successfully", async () => {
      const result = await authService.register({
        email: "test@example.com",
        password: "SecureP@ss1!",
      });

      await authService.changePassword(result.user.id, "SecureP@ss1!", "NewSecureP@ss2!");

      const loginResult = await authService.login({
        email: "test@example.com",
        password: "NewSecureP@ss2!",
      });
      expect(loginResult.user.email).toBe("test@example.com");
    });

    it("should reject wrong current password", async () => {
      const result = await authService.register({
        email: "test@example.com",
        password: "SecureP@ss1!",
      });

      await expect(
        authService.changePassword(result.user.id, "WrongP@ss!", "NewSecureP@ss2!")
      ).rejects.toThrow(InvalidCredentialsError);
    });
  });

  describe("deleteAccount", () => {
    it("should delete account with valid password", async () => {
      const result = await authService.register({
        email: "test@example.com",
        password: "SecureP@ss1!",
      });

      await authService.deleteAccount(result.user.id, "SecureP@ss1!");

      await expect(authService.getUser(result.user.id)).rejects.toThrow(UserNotFoundError);
    });

    it("should reject deletion with wrong password", async () => {
      const result = await authService.register({
        email: "test@example.com",
        password: "SecureP@ss1!",
      });

      await expect(
        authService.deleteAccount(result.user.id, "WrongP@ss!")
      ).rejects.toThrow(InvalidCredentialsError);
    });
  });

  describe("getUser", () => {
    it("should return public user profile", async () => {
      const result = await authService.register({
        email: "test@example.com",
        password: "SecureP@ss1!",
      });

      const user = await authService.getUser(result.user.id);
      expect(user.email).toBe("test@example.com");
      expect(user.roles).toEqual(["user"]);
      expect("passwordHash" in user).toBe(false);
    });

    it("should throw for non-existent user", async () => {
      await expect(authService.getUser("non-existent")).rejects.toThrow(UserNotFoundError);
    });
  });
});
