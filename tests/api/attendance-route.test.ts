import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { connectMongoDB } from "@/lib/mongodb";
import { AttendanceRecordModel } from "@/repositories/models/attendance-record-model";
import { EmployeeModel } from "@/repositories/models/employee-model";
import { CatalogModel } from "@/repositories/models/catalog-model";
import type { Role } from "@/types/user";

// See tests/api/employees-route.test.ts for why mocking next-auth's
// getServerSession alone is enough here.
const getServerSessionMock = vi.fn<() => Promise<Session | null>>();
vi.mock("next-auth", () => ({
  getServerSession: () => getServerSessionMock(),
}));

function sessionFor(role: Role, employeeId?: string): Session {
  return {
    user: { id: "actor-1", role, sessionId: "session-1", employeeId },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as Session;
}

const { GET, POST } = await import("@/app/api/v1/employees/[id]/attendance/route");
const { PATCH, DELETE } = await import("@/app/api/v1/employees/[id]/attendance/[recordId]/route");

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function makeEmployee(positionId = "pos-1", projectSiteId = "proj-1") {
  const doc = await EmployeeModel.create({
    name: "Alice Reyes",
    gender: "Female",
    positionId,
    projectSiteId,
    dateHired: "2020-01-01",
    employmentStatusId: "status-1",
  });
  return doc._id.toString();
}

async function makeBuildingAdministratorPosition() {
  const doc = await CatalogModel.create({
    kind: "position",
    name: "Building Administrator/Property Manager",
    active: true,
    grantsAttendanceSelfService: true,
  });
  return doc._id.toString();
}

beforeEach(async () => {
  await connectMongoDB();
  await AttendanceRecordModel.deleteMany({});
  await EmployeeModel.deleteMany({});
  await CatalogModel.deleteMany({});
});

afterAll(async () => {
  await AttendanceRecordModel.deleteMany({});
  await EmployeeModel.deleteMany({});
  await CatalogModel.deleteMany({});
});

describe("GET/POST /api/v1/employees/[id]/attendance", () => {
  it("returns 401 when there is no session", async () => {
    const employeeId = await makeEmployee();
    getServerSessionMock.mockResolvedValue(null);
    const response = await GET(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/attendance?month=2026-01`, "GET"),
      { params: Promise.resolve({ id: employeeId }) },
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 for a role that cannot log attendance", async () => {
    const employeeId = await makeEmployee();
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await POST(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/attendance`, "POST", {
        date: "2026-01-10",
        statusId: "status-present",
      }),
      { params: Promise.resolve({ id: employeeId }) },
    );
    expect(response.status).toBe(403);
  });

  it("logs attendance for HR and lists it back for the month", async () => {
    const employeeId = await makeEmployee();
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const created = await POST(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/attendance`, "POST", {
        date: "2026-01-10",
        statusId: "status-present",
      }),
      { params: Promise.resolve({ id: employeeId }) },
    );
    expect(created.status).toBe(201);

    const response = await GET(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/attendance?month=2026-01`, "GET"),
      { params: Promise.resolve({ id: employeeId }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
  });
});

describe("PATCH/DELETE /api/v1/employees/[id]/attendance/[recordId]", () => {
  async function seedAttendanceRecord() {
    const employeeId = await makeEmployee();
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const created = await POST(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/attendance`, "POST", {
        date: "2026-01-10",
        statusId: "status-present",
      }),
      { params: Promise.resolve({ id: employeeId }) },
    );
    return { employeeId, recordId: (await created.json()).id as string };
  }

  it("updates an attendance record for HR", async () => {
    const { employeeId, recordId } = await seedAttendanceRecord();
    const response = await PATCH(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/attendance/${recordId}`, "PATCH", {
        statusId: "status-absent",
        remarks: "Called in sick",
      }),
      { params: Promise.resolve({ id: employeeId, recordId }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.remarks).toBe("Called in sick");
  });

  it("deletes an attendance record for Admin", async () => {
    const { employeeId, recordId } = await seedAttendanceRecord();
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const response = await DELETE(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/attendance/${recordId}`, "DELETE"),
      { params: Promise.resolve({ id: employeeId, recordId }) },
    );
    expect(response.status).toBe(200);
    await expect(AttendanceRecordModel.findById(recordId)).resolves.toBeNull();
  });
});

describe("attendance ownership scoping", () => {
  it("lets an Employee view only their own record, not a coworker's", async () => {
    const employeeId = await makeEmployee();
    const otherId = await makeEmployee();
    getServerSessionMock.mockResolvedValue(sessionFor("Employee", employeeId));

    const own = await GET(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/attendance?month=2026-01`, "GET"),
      { params: Promise.resolve({ id: employeeId }) },
    );
    expect(own.status).toBe(200);

    const coworker = await GET(
      jsonRequest(`http://localhost/api/v1/employees/${otherId}/attendance?month=2026-01`, "GET"),
      { params: Promise.resolve({ id: otherId }) },
    );
    expect(coworker.status).toBe(403);
  });

  it("rejects a plain Employee logging their own attendance (no Building Administrator position)", async () => {
    const employeeId = await makeEmployee();
    getServerSessionMock.mockResolvedValue(sessionFor("Employee", employeeId));

    const response = await POST(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/attendance`, "POST", {
        date: "2026-01-10",
        statusId: "status-present",
      }),
      { params: Promise.resolve({ id: employeeId }) },
    );
    expect(response.status).toBe(403);
  });

  it("lets a Building Administrator log, edit, and delete their own attendance, but not an employee outside their project", async () => {
    const positionId = await makeBuildingAdministratorPosition();
    const employeeId = await makeEmployee(positionId, "proj-1");
    const otherProjectId = await makeEmployee("pos-1", "proj-2");
    getServerSessionMock.mockResolvedValue(sessionFor("Employee", employeeId));

    const created = await POST(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/attendance`, "POST", {
        date: "2026-01-10",
        statusId: "status-present",
      }),
      { params: Promise.resolve({ id: employeeId }) },
    );
    expect(created.status).toBe(201);
    const recordId = (await created.json()).id as string;

    const updated = await PATCH(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/attendance/${recordId}`, "PATCH", {
        statusId: "status-absent",
      }),
      { params: Promise.resolve({ id: employeeId, recordId }) },
    );
    expect(updated.status).toBe(200);

    const forOtherProject = await POST(
      jsonRequest(`http://localhost/api/v1/employees/${otherProjectId}/attendance`, "POST", {
        date: "2026-01-11",
        statusId: "status-present",
      }),
      { params: Promise.resolve({ id: otherProjectId }) },
    );
    expect(forOtherProject.status).toBe(403);

    const deleted = await DELETE(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/attendance/${recordId}`, "DELETE"),
      { params: Promise.resolve({ id: employeeId, recordId }) },
    );
    expect(deleted.status).toBe(200);
  });

  it("lets a Building Administrator log, edit, and delete attendance for a co-worker within their own project site", async () => {
    const positionId = await makeBuildingAdministratorPosition();
    const employeeId = await makeEmployee(positionId, "proj-1");
    const coworkerId = await makeEmployee("pos-1", "proj-1");
    getServerSessionMock.mockResolvedValue(sessionFor("Employee", employeeId));

    const created = await POST(
      jsonRequest(`http://localhost/api/v1/employees/${coworkerId}/attendance`, "POST", {
        date: "2026-01-10",
        statusId: "status-present",
      }),
      { params: Promise.resolve({ id: coworkerId }) },
    );
    expect(created.status).toBe(201);
    const recordId = (await created.json()).id as string;

    const updated = await PATCH(
      jsonRequest(`http://localhost/api/v1/employees/${coworkerId}/attendance/${recordId}`, "PATCH", {
        statusId: "status-absent",
      }),
      { params: Promise.resolve({ id: coworkerId, recordId }) },
    );
    expect(updated.status).toBe(200);

    const deleted = await DELETE(
      jsonRequest(`http://localhost/api/v1/employees/${coworkerId}/attendance/${recordId}`, "DELETE"),
      { params: Promise.resolve({ id: coworkerId, recordId }) },
    );
    expect(deleted.status).toBe(200);
  });
});
