import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { connectMongoDB } from "@/lib/mongodb";
import { ConflictError } from "@/lib/app-errors";
import { MongoUserRepository } from "@/repositories/user-repository";
import { UserModel } from "@/repositories/models/user-model";
import type { CreateUserInput } from "@/schemas/user";

const repository = new MongoUserRepository();

function makeInput(overrides: Partial<CreateUserInput> = {}): CreateUserInput {
  return {
    username: "jane",
    name: "Jane Doe",
    password: "supersecret1",
    role: "HR",
    ...overrides,
  };
}

beforeEach(async () => {
  await connectMongoDB();
  await UserModel.deleteMany({});
});

afterAll(async () => {
  await UserModel.deleteMany({});
});

describe("MongoUserRepository.create", () => {
  it("stores a bcrypt hash, never the plain password", async () => {
    const created = await repository.create(makeInput({ password: "supersecret1" }));
    const doc = await UserModel.findById(created.id).select("+passwordHash").lean<{ passwordHash: string }>();
    expect(doc?.passwordHash).toBeDefined();
    expect(doc?.passwordHash).not.toBe("supersecret1");
    // bcrypt hashes always start with a $2 version prefix.
    expect(doc?.passwordHash).toMatch(/^\$2[aby]?\$/);
  });

  it("lowercases the username on create", async () => {
    const created = await repository.create(makeInput({ username: "JaneDoe" }));
    expect(created.username).toBe("janedoe");
  });

  it("rejects a duplicate username with ConflictError", async () => {
    await repository.create(makeInput({ username: "jane" }));
    await expect(repository.create(makeInput({ username: "jane" }))).rejects.toBeInstanceOf(ConflictError);
  });

  it("treats usernames as case-insensitively duplicate (both lowercase on write)", async () => {
    await repository.create(makeInput({ username: "jane" }));
    await expect(repository.create(makeInput({ username: "JANE" }))).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("MongoUserRepository.update", () => {
  it("re-hashes the password when one is provided", async () => {
    const created = await repository.create(makeInput());
    const before = await UserModel.findById(created.id).select("+passwordHash").lean<{ passwordHash: string }>();

    await repository.update(created.id, { password: "a-new-password1" });

    const after = await UserModel.findById(created.id).select("+passwordHash").lean<{ passwordHash: string }>();
    expect(after?.passwordHash).not.toBe(before?.passwordHash);
  });

  it("leaves the password hash untouched when no password is given", async () => {
    const created = await repository.create(makeInput());
    const before = await UserModel.findById(created.id).select("+passwordHash").lean<{ passwordHash: string }>();

    await repository.update(created.id, { name: "Jane Renamed" });

    const after = await UserModel.findById(created.id).select("+passwordHash").lean<{ passwordHash: string }>();
    expect(after?.passwordHash).toBe(before?.passwordHash);
  });
});

describe("MongoUserRepository.findAll", () => {
  it("paginates results", async () => {
    for (let i = 0; i < 3; i += 1) {
      await repository.create(makeInput({ username: `user${i}` }));
    }
    const page1 = await repository.findAll({ page: 1, pageSize: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(3);

    const page2 = await repository.findAll({ page: 2, pageSize: 2 });
    expect(page2.items).toHaveLength(1);
  });
});
