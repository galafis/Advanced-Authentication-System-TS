import { InMemoryUserStore } from "../user.store";
import { User } from "../../types";
import { UserNotFoundError } from "../../errors";

function createTestUser(overrides: Partial<User> = {}): User {
  return {
    id: "test-id-1",
    email: "test@example.com",
    passwordHash: "$2b$12$hashedpassword",
    createdAt: new Date(),
    updatedAt: new Date(),
    mfaEnabled: false,
    mfaSecret: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    roles: ["user"],
    ...overrides,
  };
}

describe("InMemoryUserStore", () => {
  let store: InMemoryUserStore;

  beforeEach(() => {
    store = new InMemoryUserStore();
  });

  describe("create", () => {
    it("should create and return user", async () => {
      const user = createTestUser();
      const created = await store.create(user);
      expect(created.id).toBe("test-id-1");
      expect(created.email).toBe("test@example.com");
    });
  });

  describe("findById", () => {
    it("should find existing user by id", async () => {
      await store.create(createTestUser());
      const found = await store.findById("test-id-1");
      expect(found).not.toBeNull();
      expect(found!.email).toBe("test@example.com");
    });

    it("should return null for non-existent user", async () => {
      const found = await store.findById("non-existent");
      expect(found).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("should find existing user by email", async () => {
      await store.create(createTestUser());
      const found = await store.findByEmail("test@example.com");
      expect(found).not.toBeNull();
      expect(found!.id).toBe("test-id-1");
    });

    it("should return null for non-existent email", async () => {
      const found = await store.findByEmail("nope@example.com");
      expect(found).toBeNull();
    });
  });

  describe("update", () => {
    it("should update user fields", async () => {
      await store.create(createTestUser());
      const updated = await store.update("test-id-1", { mfaEnabled: true });
      expect(updated.mfaEnabled).toBe(true);
    });

    it("should update email index when email changes", async () => {
      await store.create(createTestUser());
      await store.update("test-id-1", { email: "new@example.com" });

      const oldResult = await store.findByEmail("test@example.com");
      expect(oldResult).toBeNull();

      const newResult = await store.findByEmail("new@example.com");
      expect(newResult).not.toBeNull();
    });

    it("should throw for non-existent user", async () => {
      await expect(store.update("non-existent", {})).rejects.toThrow(UserNotFoundError);
    });
  });

  describe("delete", () => {
    it("should delete existing user", async () => {
      await store.create(createTestUser());
      const result = await store.delete("test-id-1");
      expect(result).toBe(true);

      const found = await store.findById("test-id-1");
      expect(found).toBeNull();
    });

    it("should return false for non-existent user", async () => {
      const result = await store.delete("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("count", () => {
    it("should return correct count", async () => {
      expect(await store.count()).toBe(0);
      await store.create(createTestUser());
      expect(await store.count()).toBe(1);
      await store.create(createTestUser({ id: "test-id-2", email: "b@example.com" }));
      expect(await store.count()).toBe(2);
    });
  });
});
