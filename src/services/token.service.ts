import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  AuthConfig,
  TokenPair,
  AccessTokenPayload,
  RefreshTokenPayload,
} from "../types";
import { InvalidTokenError, TokenExpiredError } from "../errors";

export class TokenService {
  private readonly config: AuthConfig["jwt"];
  private readonly revokedTokens: Set<string> = new Set();

  constructor(config: AuthConfig["jwt"]) {
    this.config = config;
  }

  generateTokenPair(userId: string, email: string, roles: string[]): TokenPair {
    const accessToken = this.generateAccessToken(userId, email, roles);
    const refreshToken = this.generateRefreshToken(userId);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.accessTokenExpiresIn,
    };
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const payload = jwt.verify(token, this.config.accessTokenSecret, {
        issuer: this.config.issuer,
      }) as AccessTokenPayload;

      if (payload.type !== "access") {
        throw new InvalidTokenError("Expected access token");
      }

      return payload;
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw error;
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError("Access token has expired");
      }
      throw new InvalidTokenError("Invalid access token");
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const payload = jwt.verify(token, this.config.refreshTokenSecret, {
        issuer: this.config.issuer,
      }) as RefreshTokenPayload;

      if (payload.type !== "refresh") {
        throw new InvalidTokenError("Expected refresh token");
      }

      if (this.revokedTokens.has(payload.jti)) {
        throw new InvalidTokenError("Refresh token has been revoked");
      }

      return payload;
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw error;
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError("Refresh token has expired");
      }
      throw new InvalidTokenError("Invalid refresh token");
    }
  }

  revokeRefreshToken(token: string): void {
    try {
      const payload = jwt.decode(token) as RefreshTokenPayload | null;
      if (payload?.jti) {
        this.revokedTokens.add(payload.jti);
      }
    } catch {
      // Token is already invalid, nothing to revoke
    }
  }

  revokeAllUserTokens(refreshTokens: string[]): void {
    for (const token of refreshTokens) {
      this.revokeRefreshToken(token);
    }
  }

  private generateAccessToken(
    userId: string,
    email: string,
    roles: string[]
  ): string {
    const payload = {
      sub: userId,
      email,
      roles,
      type: "access" as const,
    };

    return jwt.sign(payload, this.config.accessTokenSecret, {
      expiresIn: this.config.accessTokenExpiresIn,
      issuer: this.config.issuer,
    });
  }

  private generateRefreshToken(userId: string): string {
    const payload = {
      sub: userId,
      type: "refresh" as const,
      jti: crypto.randomUUID(),
    };

    return jwt.sign(payload, this.config.refreshTokenSecret, {
      expiresIn: this.config.refreshTokenExpiresIn,
      issuer: this.config.issuer,
    });
  }
}
