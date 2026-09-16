import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { connectMongoDB } from "@/lib/mongodb";
import { JobApplicationModel } from "@/repositories/models/job-application-model";
import { CatalogModel } from "@/repositories/models/catalog-model";
import { DEFAULT_APPLICATION_STAGE_NAME } from "@/schemas/job-application";
import { RECRUITMENT_STAGE_CATEGORY } from "@/types/catalog";
import type { Role } from "@/types/user";

// See tests/api/employees-route.test.ts for why mocking next-auth's
// getServerSession alone is enough here.
const getServerSessionMock = vi.fn<() => Promise<Session | null>>();
vi.mock("next-auth", () => ({
  getServerSession: () => getServerSessionMock(),
}));

function sessionFor(role: Role): Session {
  return {
    user: { id: "actor-1", role, sessionId: "session-1" },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as Session;
}

const { GET, POST } = await import("@/app/api/v1/job-applications/route");
const { PATCH, DELETE } = await import("@/app/api/v1/job-applications/[id]/route");
const { PATCH: MOVE_STAGE } = await import("@/app/api/v1/job-applications/[id]/stage/route");

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function validApplicationInput(overrides: Record<string, unknown> = {}) {
  return {
    applicantName: "Alice Reyes",
    positionId: "pos-1",
    appliedDate: "2026-01-10",
    ...overrides,
  };
}

beforeEach(async () => {
  await connectMongoDB();
  await JobApplicationModel.deleteMany({});
  await CatalogModel.deleteMany({ kind: "status", category: RECRUITMENT_STAGE_CATEGORY });
  await CatalogModel.create({
    kind: "status",
    category: RECRUITMENT_STAGE_CATEGORY,
    name: DEFAULT_APPLICATION_STAGE_NAME,
  });
});

afterAll(async () => {
  await JobApplicationModel.deleteMany({});
  await CatalogModel.deleteMany({ kind: "status", category: RECRUITMENT_STAGE_CATEGORY });
});

describe("GET /api/v1/job-applications", () => {
  it("returns 401 when there is no session", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const response = await GET(jsonRequest("http://localhost/api/v1/job-applications", "GET"));
    expect(response.status).toBe(401);
  });

  it("lists every application, unbounded, for Admin/HR", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    await POST(jsonRequest("http://localhost/api/v1/job-applications", "POST", validApplicationInput()));

    const response = await GET(jsonRequest("http://localhost/api/v1/job-applications", "GET"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
  });

  it("returns 403 for Employee — recruitment is Admin/HR only", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await GET(jsonRequest("http://localhost/api/v1/job-applications", "GET"));
    expect(response.status).toBe(403);
  });
});

describe("POST /api/v1/job-applications", () => {
  it("returns 403 for a role that cannot manage recruitment", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await POST(
      jsonRequest("http://localhost/api/v1/job-applications", "POST", validApplicationInput()),
    );
    expect(response.status).toBe(403);
  });

  it("creates an application in the default stage for HR", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const response = await POST(
      jsonRequest("http://localhost/api/v1/job-applications", "POST", validApplicationInput()),
    );
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.stage).toBe(DEFAULT_APPLICATION_STAGE_NAME);
  });
});

describe("PATCH/DELETE /api/v1/job-applications/[id]", () => {
  async function seedApplication() {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const created = await POST(
      jsonRequest("http://localhost/api/v1/job-applications", "POST", validApplicationInput()),
    );
    return (await created.json()).id as string;
  }

  it("updates an application for HR", async () => {
    const id = await seedApplication();
    const response = await PATCH(
      jsonRequest(`http://localhost/api/v1/job-applications/${id}`, "PATCH", validApplicationInput({ applicantName: "Alice R. Reyes" })),
      { params: Promise.resolve({ id }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.applicantName).toBe("Alice R. Reyes");
  });

  it("deletes an application for Admin", async () => {
    const id = await seedApplication();
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const response = await DELETE(
      jsonRequest(`http://localhost/api/v1/job-applications/${id}`, "DELETE"),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    await expect(JobApplicationModel.findById(id)).resolves.toBeNull();
  });
});

describe("PATCH /api/v1/job-applications/[id]/stage", () => {
  it("moves an application to a different stage for HR", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const created = await POST(
      jsonRequest("http://localhost/api/v1/job-applications", "POST", validApplicationInput()),
    );
    const id = (await created.json()).id as string;
    const otherStage = await CatalogModel.create({
      kind: "status",
      category: RECRUITMENT_STAGE_CATEGORY,
      name: "Interview",
    });

    const response = await MOVE_STAGE(
      jsonRequest(`http://localhost/api/v1/job-applications/${id}/stage`, "PATCH", {
        stageId: otherStage._id.toString(),
      }),
      { params: Promise.resolve({ id }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.stage).toBe("Interview");
  });

  it("returns 403 for a role that cannot manage recruitment", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const created = await POST(
      jsonRequest("http://localhost/api/v1/job-applications", "POST", validApplicationInput()),
    );
    const id = (await created.json()).id as string;

    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await MOVE_STAGE(
      jsonRequest(`http://localhost/api/v1/job-applications/${id}/stage`, "PATCH", { stageId: "some-stage" }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(403);
  });
});
