import { User, UserStore } from "../types";
import { UserNotFoundError } from "../errors";

export class InMemoryUserStore implements UserStore {
  private readonly users: Map<string, User> = new Map();
  private readonly emailIndex: Map<string, string> = new Map();

  async create(user: User): Promise<User> {
    this.users.set(user.id, { ...user });
    this.emailIndex.set(user.email, user.id);
    return { ...user };
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const id = this.emailIndex.get(email);
    if (!id) return null;
    return this.findById(id);
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) {
      throw new UserNotFoundError();
    }

    const updated: User = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date(),
    };

    if (updates.email && updates.email !== existing.email) {
      this.emailIndex.delete(existing.email);
      this.emailIndex.set(updates.email, id);
    }

    this.users.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;

    this.emailIndex.delete(user.email);
    this.users.delete(id);
    return true;
  }

  async count(): Promise<number> {
    return this.users.size;
  }

  async clear(): Promise<void> {
    this.users.clear();
    this.emailIndex.clear();
  }
}
