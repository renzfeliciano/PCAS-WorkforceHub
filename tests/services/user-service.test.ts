import { describe, expect, it } from "vitest";
import { ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import {
  changeOwnPassword,
  createUser,
  deactivateUser,
  provisionEmployeeAccount,
  updateUser,
} from "@/services/user-service";
import type { UserRepository } from "@/repositories/user-repository";
import type { AppUser } from "@/types/user";
import { adminActor, employeeActor, hrActor, noopAudit } from "../test-utils";

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: "user-1",
    username: "jane",
    name: "Jane Doe",
    role: "HR",
    active: true,
    mustChangePassword: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function fakeRepository(seed: AppUser[] = []): UserRepository {
  const users = new Map(seed.map((u) => [u.id, u]));
  return {
    findAll: async () => ({ items: [...users.values()], total: users.size, page: 1, pageSize: 20 }),
    findById: async (id) => users.get(id) ?? null,
    findByEmployeeId: async (employeeId) =>
      [...users.values()].find((u) => u.employeeId === employeeId) ?? null,
    listAllUsernames: async () => [...users.values()].map((u) => u.username),
    findUsernamesByEmployeeIds: async (employeeIds) =>
      new Map(
        [...users.values()]
          .filter((u) => u.employeeId && employeeIds.includes(u.employeeId))
          .map((u) => [u.employeeId!, u.username]),
      ),
    verifyPassword: async (id, password) =>
      users.has(id) && password === "correct-current-password",
    create: async (input) => {
      const user = makeUser({ id: "user-new", ...input, active: true });
      users.set(user.id, user);
      return user;
    },
    update: async (id, patch) => {
      const existing = users.get(id);
      if (!existing) throw new NotFoundError("User not found");
      const updated = { ...existing, ...patch };
      users.set(id, updated);
      return updated;
    },
  };
}

describe("createUser", () => {
  it("is Admin/HR only", async () => {
    const repo = fakeRepository();
    await expect(
      createUser(repo, noopAudit, employeeActor, {
        username: "newuser",
        name: "New User",
        password: "supersecret1",
        role: "HR",
      }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("creates a user for HR", async () => {
    const repo = fakeRepository();
    const user = await createUser(repo, noopAudit, hrActor, {
      username: "newuser",
      name: "New User",
      password: "supersecret1",
      role: "Employee",
    });
    expect(user.username).toBe("newuser");
  });

  it("rejects a password shorter than 8 characters", async () => {
    const repo = fakeRepository();
    await expect(
      createUser(repo, noopAudit, adminActor, {
        username: "newuser",
        name: "New User",
        password: "short",
        role: "HR",
      }),
    ).rejects.toThrow();
  });

  it("creates a user for Admin", async () => {
    const repo = fakeRepository();
    const user = await createUser(repo, noopAudit, adminActor, {
      username: "newuser",
      name: "New User",
      password: "supersecret1",
      role: "HR",
    });
    expect(user.username).toBe("newuser");
  });
});

describe("updateUser", () => {
  it("is Admin/HR only", async () => {
    const repo = fakeRepository([makeUser()]);
    await expect(
      updateUser(repo, noopAudit, employeeActor, "user-1", { name: "Renamed" }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("lets HR update another user", async () => {
    const repo = fakeRepository([makeUser()]);
    const updated = await updateUser(repo, noopAudit, hrActor, "user-1", { name: "Renamed" });
    expect(updated.name).toBe("Renamed");
  });

  it("lets Admin change another user's role", async () => {
    const repo = fakeRepository([makeUser({ id: "user-2" })]);
    const updated = await updateUser(repo, noopAudit, adminActor, "user-2", { role: "Manager" });
    expect(updated.role).toBe("Manager");
  });

  // Self-protection: prevents an Admin from locking themselves out (no role
  // downgrade, no self-deactivation) by editing their own account.
  it("blocks an Admin from changing their own role", async () => {
    const repo = fakeRepository([makeUser({ id: adminActor.id, role: "Admin" })]);
    await expect(
      updateUser(repo, noopAudit, adminActor, adminActor.id, { role: "HR" }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("blocks an Admin from deactivating their own account", async () => {
    const repo = fakeRepository([makeUser({ id: adminActor.id, role: "Admin" })]);
    await expect(
      updateUser(repo, noopAudit, adminActor, adminActor.id, { active: false }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("still lets an Admin update their own name (non-self-protected fields)", async () => {
    const repo = fakeRepository([makeUser({ id: adminActor.id, role: "Admin" })]);
    const updated = await updateUser(repo, noopAudit, adminActor, adminActor.id, {
      name: "New Name",
    });
    expect(updated.name).toBe("New Name");
  });
});

describe("provisionEmployeeAccount", () => {
  it("creates an account whose role matches the employee's userRole, linked to the employee", async () => {
    const repo = fakeRepository();
    const user = await provisionEmployeeAccount(
      repo,
      noopAudit,
      hrActor,
      { id: "emp-1", name: "Tondo, Ryan June", userRole: "Employee" },
      new Set(),
    );
    expect(user.username).toBe("tondo_ryan");
    expect(user.role).toBe("Employee");
    expect(user.employeeId).toBe("emp-1");
  });

  it("avoids a username collision against the existing set, and records the new username in it", async () => {
    const repo = fakeRepository();
    const existing = new Set(["tondo_ryan"]);
    const user = await provisionEmployeeAccount(
      repo,
      noopAudit,
      hrActor,
      { id: "emp-2", name: "Tondo, Ryan Miguel", userRole: "Employee" },
      existing,
    );
    expect(user.username).toBe("tondo_ryan_m");
    expect(existing.has("tondo_ryan_m")).toBe(true);
  });
});

describe("changeOwnPassword", () => {
  it("rejects an incorrect current password", async () => {
    const repo = fakeRepository([makeUser()]);
    await expect(
      changeOwnPassword(repo, noopAudit, { ...hrActor, id: "user-1" }, "wrong", "newpassword1"),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("changes the password and clears mustChangePassword when the current password is correct", async () => {
    const repo = fakeRepository([makeUser({ id: "user-1", mustChangePassword: true })]);
    const updated = await changeOwnPassword(
      repo,
      noopAudit,
      { ...hrActor, id: "user-1" },
      "correct-current-password",
      "newpassword1",
    );
    expect(updated.mustChangePassword).toBe(false);
  });
});

describe("deactivateUser", () => {
  it("deactivates another user for Admin", async () => {
    const repo = fakeRepository([makeUser({ id: "user-2" })]);
    const deactivated = await deactivateUser(repo, noopAudit, adminActor, "user-2");
    expect(deactivated.active).toBe(false);
  });

  it("still can't be used to deactivate the acting Admin's own account", async () => {
    const repo = fakeRepository([makeUser({ id: adminActor.id, role: "Admin" })]);
    await expect(deactivateUser(repo, noopAudit, adminActor, adminActor.id)).rejects.toBeInstanceOf(
      ForbiddenActionError,
    );
  });
});
