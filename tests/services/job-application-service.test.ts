import { describe, expect, it } from "vitest";
import { ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import {
  createJobApplication,
  deleteJobApplication,
  moveJobApplicationStage,
  updateJobApplication,
} from "@/services/job-application-service";
import type { JobApplicationRepository } from "@/repositories/job-application-repository";
import type { JobApplication } from "@/types/job-application";
import { employeeActor, hrActor, noopAudit } from "../test-utils";

function makeApplication(overrides: Partial<JobApplication> = {}): JobApplication {
  return {
    id: "app-1",
    applicantName: "Jane Doe",
    position: "Engineer",
    stage: "Applied",
    appliedDate: "2026-01-01",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function fakeRepository(seed: JobApplication[] = []): JobApplicationRepository {
  const applications = new Map(seed.map((a) => [a.id, a]));
  return {
    findAll: async () => [...applications.values()],
    findById: async (id) => applications.get(id) ?? null,
    create: async (input) => {
      const application = makeApplication({ id: "app-new", ...input, stage: "Applied" });
      applications.set(application.id, application);
      return application;
    },
    update: async (id, patch) => {
      const existing = applications.get(id);
      if (!existing) throw new NotFoundError("Job application not found");
      const updated = { ...existing, ...patch };
      applications.set(id, updated);
      return updated;
    },
    updateStage: async (id, stage) => {
      const existing = applications.get(id);
      if (!existing) throw new NotFoundError("Job application not found");
      const updated = { ...existing, stage };
      applications.set(id, updated);
      return updated;
    },
    delete: async (id) => {
      if (!applications.has(id)) throw new NotFoundError("Job application not found");
      applications.delete(id);
    },
  };
}

describe("createJobApplication", () => {
  it("rejects roles that cannot manage recruitment", async () => {
    const repo = fakeRepository();
    await expect(
      createJobApplication(repo, noopAudit, employeeActor, {
        applicantName: "Jane Doe",
        position: "Engineer",
        appliedDate: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("rejects an invalid email", async () => {
    const repo = fakeRepository();
    await expect(
      createJobApplication(repo, noopAudit, hrActor, {
        applicantName: "Jane Doe",
        position: "Engineer",
        appliedDate: "2026-01-01",
        email: "not-an-email",
      }),
    ).rejects.toThrow();
  });

  it("creates an application for HR, always at the default stage", async () => {
    const repo = fakeRepository();
    const application = await createJobApplication(repo, noopAudit, hrActor, {
      applicantName: "Jane Doe",
      position: "Engineer",
      appliedDate: "2026-01-01",
    });
    expect(application.stage).toBe("Applied");
  });
});

describe("moveJobApplicationStage", () => {
  it("rejects roles that cannot manage recruitment", async () => {
    const repo = fakeRepository([makeApplication()]);
    await expect(
      moveJobApplicationStage(repo, noopAudit, employeeActor, "app-1", { stage: "Interview" }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("moves the applicant to a new stage without touching other fields", async () => {
    const repo = fakeRepository([makeApplication()]);
    const moved = await moveJobApplicationStage(repo, noopAudit, hrActor, "app-1", {
      stage: "Interview",
    });
    expect(moved.stage).toBe("Interview");
    expect(moved.applicantName).toBe("Jane Doe");
  });

  it("throws NotFoundError for a missing application", async () => {
    const repo = fakeRepository([]);
    await expect(
      moveJobApplicationStage(repo, noopAudit, hrActor, "missing", { stage: "Interview" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("updateJobApplication", () => {
  it("rejects roles that cannot manage recruitment", async () => {
    const repo = fakeRepository([makeApplication()]);
    await expect(
      updateJobApplication(repo, noopAudit, employeeActor, "app-1", {
        applicantName: "Jane Doe",
        position: "Senior Engineer",
        appliedDate: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });
});

describe("deleteJobApplication", () => {
  it("rejects roles that cannot manage recruitment", async () => {
    const repo = fakeRepository([makeApplication()]);
    await expect(
      deleteJobApplication(repo, noopAudit, employeeActor, "app-1"),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("deletes for HR", async () => {
    const repo = fakeRepository([makeApplication()]);
    await expect(deleteJobApplication(repo, noopAudit, hrActor, "app-1")).resolves.toBeUndefined();
  });
});
