import { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectMongoDB } from "@/lib/mongodb";
import { ConflictError } from "@/lib/app-errors";
import { MongoUserRepository } from "@/repositories/user-repository";
import { UserModel } from "@/repositories/models/user-model";
import { EmployeeModel } from "@/repositories/models/employee-model";
import { SettingModel } from "@/repositories/models/setting-model";
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

beforeAll(async () => {
  // connectMongoDB() now guarantees every model's indexes (including the
  // unique username one the duplicate-key tests below depend on) are built
  // before it resolves — see src/lib/mongodb.ts.
  await connectMongoDB();
});

beforeEach(async () => {
  await UserModel.deleteMany({});
  await EmployeeModel.deleteMany({});
  await SettingModel.deleteMany({});
});

afterAll(async () => {
  await UserModel.deleteMany({});
  await EmployeeModel.deleteMany({});
  await SettingModel.deleteMany({});
});

function makeEmployee(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: "Doe, John",
    gender: "Male",
    positionId: new Types.ObjectId().toString(),
    projectSiteId: new Types.ObjectId().toString(),
    dateHired: "2024-01-01",
    employmentStatusId: "status-1",
    ...overrides,
  };
}

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

describe("MongoUserRepository.create with employeeId", () => {
  it("links the account to the employee and rejects a second link to the same employee", async () => {
    const created = await repository.create(makeInput({ username: "linked1", employeeId: "emp-1" }));
    expect(created.employeeId).toBe("emp-1");

    await expect(
      repository.create(makeInput({ username: "linked2", employeeId: "emp-1" })),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("allows any number of accounts with no employeeId at all", async () => {
    await repository.create(makeInput({ username: "unlinked1" }));
    await expect(repository.create(makeInput({ username: "unlinked2" }))).resolves.toBeDefined();
  });
});

describe("MongoUserRepository.findByEmployeeId", () => {
  it("finds the account linked to an employee", async () => {
    const created = await repository.create(makeInput({ username: "linked3", employeeId: "emp-2" }));
    const found = await repository.findByEmployeeId("emp-2");
    expect(found?.id).toBe(created.id);
  });

  it("returns null when no account is linked to that employee", async () => {
    const found = await repository.findByEmployeeId("no-such-employee");
    expect(found).toBeNull();
  });
});

describe("MongoUserRepository.listAllUsernames", () => {
  it("returns every username currently in use", async () => {
    await repository.create(makeInput({ username: "alpha" }));
    await repository.create(makeInput({ username: "beta" }));
    const usernames = await repository.listAllUsernames();
    expect(usernames.sort()).toEqual(["alpha", "beta"]);
  });
});

describe("MongoUserRepository.verifyPassword", () => {
  it("returns true for the correct password", async () => {
    const created = await repository.create(makeInput({ password: "correct-password1" }));
    await expect(repository.verifyPassword(created.id, "correct-password1")).resolves.toBe(true);
  });

  it("returns false for an incorrect password", async () => {
    const created = await repository.create(makeInput({ password: "correct-password1" }));
    await expect(repository.verifyPassword(created.id, "wrong-password")).resolves.toBe(false);
  });
});

describe("MongoUserRepository.findUsernamesByEmployeeIds", () => {
  it("resolves a map of employeeId -> username for the given ids only", async () => {
    const a = await repository.create(makeInput({ username: "linked-a", employeeId: "emp-a" }));
    await repository.create(makeInput({ username: "linked-b", employeeId: "emp-b" }));
    await repository.create(makeInput({ username: "unlinked" }));

    const usernames = await repository.findUsernamesByEmployeeIds(["emp-a", "emp-missing"]);
    expect(usernames.get("emp-a")).toBe(a.username);
    expect(usernames.has("emp-b")).toBe(false);
    expect(usernames.has("emp-missing")).toBe(false);
  });

  it("returns an empty map for an empty id list", async () => {
    await expect(repository.findUsernamesByEmployeeIds([])).resolves.toEqual(new Map());
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

  it("filters by a free-text query matching name, username, or email", async () => {
    await repository.create(makeInput({ username: "tondo_ryan", name: "Ryan June Tondo" }));
    await repository.create(makeInput({ username: "hankins_pat", name: "Patrick Hankins" }));

    const byName = await repository.findAll({ query: "ryan" });
    expect(byName.items.map((u) => u.username)).toEqual(["tondo_ryan"]);

    const byUsername = await repository.findAll({ query: "hankins_pat" });
    expect(byUsername.items.map((u) => u.username)).toEqual(["hankins_pat"]);
  });

  it("filters by role", async () => {
    await repository.create(makeInput({ username: "admin1", role: "Admin" }));
    await repository.create(makeInput({ username: "hr1", role: "HR" }));

    const admins = await repository.findAll({ role: "Admin" });
    expect(admins.items.map((u) => u.username)).toEqual(["admin1"]);
  });

  it("filters by active/inactive status", async () => {
    const active = await repository.create(makeInput({ username: "active1" }));
    const toDeactivate = await repository.create(makeInput({ username: "inactive1" }));
    await repository.update(toDeactivate.id, { active: false });

    const activeOnly = await repository.findAll({ status: "active" });
    expect(activeOnly.items.map((u) => u.id)).toEqual([active.id]);

    const inactiveOnly = await repository.findAll({ status: "inactive" });
    expect(inactiveOnly.items.map((u) => u.id)).toEqual([toDeactivate.id]);
  });

  it("resolves a roster-linked account's position and project via employeeId -> Employee -> Setting.name", async () => {
    const position = await SettingModel.create({ kind: "position", name: "Building Engineer" });
    const project = await SettingModel.create({ kind: "project", name: "Sunrise Towers" });
    const employee = await EmployeeModel.create(
      makeEmployee({ positionId: position._id.toString(), projectSiteId: project._id.toString() }),
    );
    await repository.create(makeInput({ username: "linked-position", employeeId: employee._id.toString() }));

    const result = await repository.findAll({});
    const item = result.items.find((u) => u.username === "linked-position");
    expect(item?.position).toBe("Building Engineer");
    expect(item?.projectSite).toBe("Sunrise Towers");
  });

  it("shows a fallback position and project for an account with no employeeId at all", async () => {
    await repository.create(makeInput({ username: "no-employee" }));

    const result = await repository.findAll({});
    const item = result.items.find((u) => u.username === "no-employee");
    expect(item?.position).toBe("—");
    expect(item?.projectSite).toBe("—");
  });

  it("shows a fallback position and project when the linked employee has since been deleted", async () => {
    await repository.create(
      makeInput({ username: "dangling-employee", employeeId: new Types.ObjectId().toString() }),
    );

    const result = await repository.findAll({});
    const item = result.items.find((u) => u.username === "dangling-employee");
    expect(item?.position).toBe("—");
    expect(item?.projectSite).toBe("—");
  });

  it("shows a fallback position and project when the employee's catalog entries have since been deleted", async () => {
    const employee = await EmployeeModel.create(makeEmployee());
    await repository.create(makeInput({ username: "orphan-catalog", employeeId: employee._id.toString() }));

    const result = await repository.findAll({});
    const item = result.items.find((u) => u.username === "orphan-catalog");
    expect(item?.position).toBe("—");
    expect(item?.projectSite).toBe("—");
  });

  it("sorts by the resolved position name", async () => {
    const posB = await SettingModel.create({ kind: "position", name: "Building Engineer" });
    const posA = await SettingModel.create({ kind: "position", name: "Admin Aide" });
    const empB = await EmployeeModel.create(makeEmployee({ positionId: posB._id.toString() }));
    const empA = await EmployeeModel.create(makeEmployee({ positionId: posA._id.toString() }));
    await repository.create(makeInput({ username: "sort-b", employeeId: empB._id.toString() }));
    await repository.create(makeInput({ username: "sort-a", employeeId: empA._id.toString() }));

    const ascending = await repository.findAll({ sortBy: "position", sortDir: "asc" });
    expect(ascending.items.map((u) => u.username)).toEqual(["sort-a", "sort-b"]);

    const descending = await repository.findAll({ sortBy: "position", sortDir: "desc" });
    expect(descending.items.map((u) => u.username)).toEqual(["sort-b", "sort-a"]);
  });

  it("sorts by the resolved project name", async () => {
    const projB = await SettingModel.create({ kind: "project", name: "Sunrise Towers" });
    const projA = await SettingModel.create({ kind: "project", name: "Ayala Center" });
    const empB = await EmployeeModel.create(makeEmployee({ projectSiteId: projB._id.toString() }));
    const empA = await EmployeeModel.create(makeEmployee({ projectSiteId: projA._id.toString() }));
    await repository.create(makeInput({ username: "proj-b", employeeId: empB._id.toString() }));
    await repository.create(makeInput({ username: "proj-a", employeeId: empA._id.toString() }));

    const ascending = await repository.findAll({ sortBy: "projectSite", sortDir: "asc" });
    expect(ascending.items.map((u) => u.username)).toEqual(["proj-a", "proj-b"]);
  });
});
