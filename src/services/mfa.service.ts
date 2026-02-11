import crypto from "crypto";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;

export class MfaService {
  private readonly issuer: string;

  constructor(issuer: string) {
    this.issuer = issuer;
  }

  generateSecret(): string {
    const buffer = crypto.randomBytes(20);
    return this.base32Encode(buffer);
  }

  generateOtpauthUrl(secret: string, email: string): string {
    const encodedIssuer = encodeURIComponent(this.issuer);
    const encodedEmail = encodeURIComponent(email);
    return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
  }

  verifyToken(secret: string, token: string): boolean {
    if (!token || token.length !== TOTP_DIGITS || !/^\d+$/.test(token)) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const timeStep = Math.floor(now / TOTP_PERIOD);

    for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
      const expectedToken = this.generateTOTP(secret, timeStep + i);
      if (this.timingSafeEqual(token, expectedToken)) {
        return true;
      }
    }

    return false;
  }

  generateCurrentToken(secret: string): string {
    const now = Math.floor(Date.now() / 1000);
    const timeStep = Math.floor(now / TOTP_PERIOD);
    return this.generateTOTP(secret, timeStep);
  }

  private generateTOTP(secret: string, timeStep: number): string {
    const timeBuffer = Buffer.alloc(8);
    let remaining = timeStep;
    for (let i = 7; i >= 0; i--) {
      timeBuffer[i] = remaining & 0xff;
      remaining = Math.floor(remaining / 256);
    }

    const keyBuffer = this.base32Decode(secret);
    const hmac = crypto.createHmac("sha1", keyBuffer);
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, TOTP_DIGITS);
    return otp.toString().padStart(TOTP_DIGITS, "0");
  }

  private base32Encode(buffer: Buffer): string {
    let result = "";
    let bits = 0;
    let value = 0;

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        bits -= 5;
        result += BASE32_CHARS[(value >> bits) & 0x1f];
      }
    }

    if (bits > 0) {
      result += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
    }

    return result;
  }

  private base32Decode(encoded: string): Buffer {
    const cleaned = encoded.replace(/=+$/, "").toUpperCase();
    const bytes: number[] = [];
    let bits = 0;
    let value = 0;

    for (let i = 0; i < cleaned.length; i++) {
      const idx = BASE32_CHARS.indexOf(cleaned[i]);
      if (idx === -1) continue;

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        bits -= 8;
        bytes.push((value >> bits) & 0xff);
      }
    }

    return Buffer.from(bytes);
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return crypto.timingSafeEqual(bufA, bufB);
  }
}
