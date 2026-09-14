import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { connectMongoDB } from "@/lib/mongodb";
import { AssetIssuanceModel } from "@/repositories/models/asset-issuance-model";
import { EmployeeModel } from "@/repositories/models/employee-model";
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

const { GET, POST } = await import("@/app/api/v1/employees/[id]/asset-issuances/route");
const { PATCH, DELETE } = await import("@/app/api/v1/employees/[id]/asset-issuances/[recordId]/route");

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function validAssetInput(overrides: Record<string, unknown> = {}) {
  return {
    assetName: "Laptop",
    condition: "Good",
    issuedDate: "2026-01-10",
    ...overrides,
  };
}

async function makeEmployee() {
  const doc = await EmployeeModel.create({
    name: "Alice Reyes",
    gender: "Female",
    positionId: "pos-1",
    projectSiteId: "proj-1",
    dateHired: "2020-01-01",
    employmentStatusId: "status-1",
  });
  return doc._id.toString();
}

beforeEach(async () => {
  await connectMongoDB();
  await AssetIssuanceModel.deleteMany({});
  await EmployeeModel.deleteMany({});
});

afterAll(async () => {
  await AssetIssuanceModel.deleteMany({});
  await EmployeeModel.deleteMany({});
});

describe("GET/POST /api/v1/employees/[id]/asset-issuances", () => {
  it("returns 401 when there is no session", async () => {
    const employeeId = await makeEmployee();
    getServerSessionMock.mockResolvedValue(null);
    const response = await GET(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/asset-issuances`, "GET"),
      { params: Promise.resolve({ id: employeeId }) },
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 for a role that cannot manage asset issuance", async () => {
    const employeeId = await makeEmployee();
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await POST(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/asset-issuances`, "POST", validAssetInput()),
      { params: Promise.resolve({ id: employeeId }) },
    );
    expect(response.status).toBe(403);
  });

  it("returns 403 for Employee trying to view asset issuances — Admin/HR only", async () => {
    const employeeId = await makeEmployee();
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await GET(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/asset-issuances`, "GET"),
      { params: Promise.resolve({ id: employeeId }) },
    );
    expect(response.status).toBe(403);
  });

  it("logs an asset issuance for HR and lists it back", async () => {
    const employeeId = await makeEmployee();
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const created = await POST(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/asset-issuances`, "POST", validAssetInput()),
      { params: Promise.resolve({ id: employeeId }) },
    );
    expect(created.status).toBe(201);

    const response = await GET(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/asset-issuances`, "GET"),
      { params: Promise.resolve({ id: employeeId }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
  });
});

describe("PATCH/DELETE /api/v1/employees/[id]/asset-issuances/[recordId]", () => {
  async function seedAssetIssuance() {
    const employeeId = await makeEmployee();
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const created = await POST(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/asset-issuances`, "POST", validAssetInput()),
      { params: Promise.resolve({ id: employeeId }) },
    );
    return { employeeId, recordId: (await created.json()).id as string };
  }

  it("returns 403 for a role that cannot manage asset issuance", async () => {
    const { employeeId, recordId } = await seedAssetIssuance();
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await PATCH(
      jsonRequest(
        `http://localhost/api/v1/employees/${employeeId}/asset-issuances/${recordId}`,
        "PATCH",
        validAssetInput({ remarks: "Returned" }),
      ),
      { params: Promise.resolve({ id: employeeId, recordId }) },
    );
    expect(response.status).toBe(403);
  });

  it("updates an asset issuance for HR", async () => {
    const { employeeId, recordId } = await seedAssetIssuance();
    const response = await PATCH(
      jsonRequest(
        `http://localhost/api/v1/employees/${employeeId}/asset-issuances/${recordId}`,
        "PATCH",
        validAssetInput({ remarks: "Returned", returnedDate: "2026-02-01" }),
      ),
      { params: Promise.resolve({ id: employeeId, recordId }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.remarks).toBe("Returned");
  });

  it("deletes an asset issuance for Admin", async () => {
    const { employeeId, recordId } = await seedAssetIssuance();
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const response = await DELETE(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/asset-issuances/${recordId}`, "DELETE"),
      { params: Promise.resolve({ id: employeeId, recordId }) },
    );
    expect(response.status).toBe(200);
    await expect(AssetIssuanceModel.findById(recordId)).resolves.toBeNull();
  });
});
