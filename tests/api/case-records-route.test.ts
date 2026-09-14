import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { connectMongoDB } from "@/lib/mongodb";
import { CaseRecordModel } from "@/repositories/models/case-record-model";
import { SettingModel } from "@/repositories/models/setting-model";
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

const { GET, POST } = await import("@/app/api/v1/case-records/route");
const { PATCH, DELETE } = await import("@/app/api/v1/case-records/[id]/route");

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function makeSetting(kind: "project" | "status", name: string, category?: string) {
  const doc = await SettingModel.create({ kind, name, category });
  return doc._id.toString();
}

async function seedCatalogIds() {
  return {
    projectId: await makeSetting("project", "EGI Rufino"),
    classificationId: await makeSetting("status", "Civil Case", "case-classification"),
    statusId: await makeSetting("status", "Ongoing", "case-status"),
  };
}

function validInput(ids: { projectId: string; classificationId: string; statusId: string }, overrides: Record<string, unknown> = {}) {
  return {
    projectId: ids.projectId,
    caseName: "Dela Cruz vs. PCAS Corp",
    caseNumber: "NLRC-NCR-01-00123-26",
    classificationId: ids.classificationId,
    statusId: ids.statusId,
    ...overrides,
  };
}

beforeEach(async () => {
  await connectMongoDB();
  await CaseRecordModel.deleteMany({});
  await SettingModel.deleteMany({});
});

afterAll(async () => {
  await CaseRecordModel.deleteMany({});
  await SettingModel.deleteMany({});
});

describe("GET /api/v1/case-records", () => {
  it("returns 401 when there is no session", async () => {
    const response = await GET(jsonRequest("http://localhost/api/v1/case-records", "GET"));
    expect(response.status).toBe(401);
  });

  it("lists cases for Admin/HR", async () => {
    const ids = await seedCatalogIds();
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    await POST(jsonRequest("http://localhost/api/v1/case-records", "POST", validInput(ids)));

    const response = await GET(jsonRequest("http://localhost/api/v1/case-records?page=1&pageSize=20", "GET"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("returns 403 for Employee — case monitoring is Admin/HR only", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await GET(jsonRequest("http://localhost/api/v1/case-records?page=1&pageSize=20", "GET"));
    expect(response.status).toBe(403);
  });

  it("filters by projectId", async () => {
    const ids = await seedCatalogIds();
    const otherProjectId = await makeSetting("project", "South Insula");
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    await POST(jsonRequest("http://localhost/api/v1/case-records", "POST", validInput(ids, { caseNumber: "A" })));
    await POST(
      jsonRequest("http://localhost/api/v1/case-records", "POST", validInput({ ...ids, projectId: otherProjectId }, { caseNumber: "B" })),
    );

    const response = await GET(
      jsonRequest(`http://localhost/api/v1/case-records?projectId=${ids.projectId}`, "GET"),
    );
    const body = await response.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].caseNumber).toBe("A");
  });
});

describe("POST /api/v1/case-records", () => {
  it("returns 403 for a role that cannot manage case monitoring", async () => {
    const ids = await seedCatalogIds();
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await POST(jsonRequest("http://localhost/api/v1/case-records", "POST", validInput(ids)));
    expect(response.status).toBe(403);
  });

  it("creates a case and returns 201 for HR", async () => {
    const ids = await seedCatalogIds();
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const response = await POST(jsonRequest("http://localhost/api/v1/case-records", "POST", validInput(ids)));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.project).toBe("EGI Rufino");
    expect(body.classification).toBe("Civil Case");
    expect(body.status).toBe("Ongoing");
  });
});

describe("PATCH/DELETE /api/v1/case-records/[id]", () => {
  async function seedRecord() {
    const ids = await seedCatalogIds();
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const created = await POST(jsonRequest("http://localhost/api/v1/case-records", "POST", validInput(ids)));
    return { id: (await created.json()).id as string, ids };
  }

  it("updates a case for HR", async () => {
    const { id, ids } = await seedRecord();
    const response = await PATCH(
      jsonRequest(`http://localhost/api/v1/case-records/${id}`, "PATCH", validInput(ids, { caseName: "Renamed" })),
      { params: Promise.resolve({ id }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.caseName).toBe("Renamed");
  });

  it("deletes a case for Admin", async () => {
    const { id } = await seedRecord();
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const response = await DELETE(
      jsonRequest(`http://localhost/api/v1/case-records/${id}`, "DELETE"),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    await expect(CaseRecordModel.findById(id)).resolves.toBeNull();
  });
});
