import { describe, expect, it } from "vitest";
import { ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import { createUser, deactivateUser, updateUser } from "@/services/user-service";
import type { UserRepository } from "@/repositories/user-repository";
import type { AppUser } from "@/types/user";
import { adminActor, hrActor, noopAudit } from "../test-utils";

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: "user-1",
    username: "jane",
    name: "Jane Doe",
    role: "HR",
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function fakeRepository(seed: AppUser[] = []): UserRepository {
  const users = new Map(seed.map((u) => [u.id, u]));
  return {
    findAll: async () => ({ items: [...users.values()], total: users.size, page: 1, pageSize: 20 }),
    findById: async (id) => users.get(id) ?? null,
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
  it("is Admin-only", async () => {
    const repo = fakeRepository();
    await expect(
      createUser(repo, noopAudit, hrActor, {
        username: "newuser",
        name: "New User",
        password: "supersecret1",
        role: "HR",
      }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
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
  it("is Admin-only", async () => {
    const repo = fakeRepository([makeUser()]);
    await expect(
      updateUser(repo, noopAudit, hrActor, "user-1", { name: "Renamed" }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
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
