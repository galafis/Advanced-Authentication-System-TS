import { TokenService } from "../token.service";
import { InvalidTokenError, TokenExpiredError } from "../../errors";

const config = {
  accessTokenSecret: "test-access-secret",
  refreshTokenSecret: "test-refresh-secret",
  accessTokenExpiresIn: 900,
  refreshTokenExpiresIn: 604800,
  issuer: "test-auth",
};

describe("TokenService", () => {
  let service: TokenService;

  beforeEach(() => {
    service = new TokenService(config);
  });

  describe("generateTokenPair", () => {
    it("should generate access and refresh tokens", () => {
      const pair = service.generateTokenPair("user-1", "test@example.com", ["user"]);
      expect(pair.accessToken).toBeDefined();
      expect(pair.refreshToken).toBeDefined();
      expect(pair.expiresIn).toBe(900);
      expect(typeof pair.accessToken).toBe("string");
      expect(typeof pair.refreshToken).toBe("string");
    });
  });

  describe("verifyAccessToken", () => {
    it("should verify a valid access token", () => {
      const pair = service.generateTokenPair("user-1", "test@example.com", ["admin"]);
      const payload = service.verifyAccessToken(pair.accessToken);
      expect(payload.sub).toBe("user-1");
      expect(payload.email).toBe("test@example.com");
      expect(payload.roles).toEqual(["admin"]);
      expect(payload.type).toBe("access");
    });

    it("should reject an invalid token", () => {
      expect(() => service.verifyAccessToken("invalid-token")).toThrow(InvalidTokenError);
    });

    it("should reject a refresh token used as access token", () => {
      const pair = service.generateTokenPair("user-1", "test@example.com", ["user"]);
      expect(() => service.verifyAccessToken(pair.refreshToken)).toThrow(InvalidTokenError);
    });
  });

  describe("verifyRefreshToken", () => {
    it("should verify a valid refresh token", () => {
      const pair = service.generateTokenPair("user-1", "test@example.com", ["user"]);
      const payload = service.verifyRefreshToken(pair.refreshToken);
      expect(payload.sub).toBe("user-1");
      expect(payload.type).toBe("refresh");
      expect(payload.jti).toBeDefined();
    });

    it("should reject an access token used as refresh token", () => {
      const pair = service.generateTokenPair("user-1", "test@example.com", ["user"]);
      expect(() => service.verifyRefreshToken(pair.accessToken)).toThrow(InvalidTokenError);
    });
  });

  describe("revokeRefreshToken", () => {
    it("should revoke a refresh token", () => {
      const pair = service.generateTokenPair("user-1", "test@example.com", ["user"]);
      service.revokeRefreshToken(pair.refreshToken);
      expect(() => service.verifyRefreshToken(pair.refreshToken)).toThrow(InvalidTokenError);
    });
  });

  describe("expired tokens", () => {
    it("should reject expired access tokens", () => {
      const shortLivedService = new TokenService({
        ...config,
        accessTokenExpiresIn: 0,
      });
      const pair = shortLivedService.generateTokenPair("user-1", "test@example.com", ["user"]);
      expect(() => shortLivedService.verifyAccessToken(pair.accessToken)).toThrow(TokenExpiredError);
    });
  });
});
