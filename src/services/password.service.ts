import bcrypt from "bcryptjs";
import { AuthConfig } from "../types";

export class PasswordService {
  private readonly saltRounds: number;

  constructor(config: AuthConfig["password"]) {
    this.saltRounds = config.saltRounds;
  }

  async hash(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(this.saltRounds);
    return bcrypt.hash(password, salt);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
