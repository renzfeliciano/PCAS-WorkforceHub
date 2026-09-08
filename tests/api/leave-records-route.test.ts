import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { connectMongoDB } from "@/lib/mongodb";
import { EmployeeModel } from "@/repositories/models/employee-model";
import { LeaveTypeModel } from "@/repositories/models/leave-type-model";
import { LeaveRecordModel } from "@/repositories/models/leave-record-model";
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

const { POST } = await import("@/app/api/v1/employees/[id]/leave-records/route");

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function seedEmployeeWithBalances(vlBalance: number, elBalance: number) {
  const [vlType, elType] = await Promise.all([
    LeaveTypeModel.create({ name: "Vacation Leave", code: "VL", order: 0 }),
    LeaveTypeModel.create({ name: "Emergency Leave", code: "EL", order: 1 }),
  ]);
  const employee = await EmployeeModel.create({
    employeeNumber: "001",
    name: "Alice Smith",
    gender: "Female",
    position: "Engineer",
    projectSite: "HO",
    dateHired: "2020-01-01",
    employmentStatus: "Regular",
    leaveBalances: [
      { leaveTypeId: vlType._id.toString(), balance: vlBalance },
      { leaveTypeId: elType._id.toString(), balance: elBalance },
    ],
  });
  return { employeeId: employee._id.toString(), vlTypeId: vlType._id.toString(), elTypeId: elType._id.toString() };
}

beforeEach(async () => {
  await connectMongoDB();
  await Promise.all([
    EmployeeModel.deleteMany({}),
    LeaveTypeModel.deleteMany({}),
    LeaveRecordModel.deleteMany({}),
  ]);
});

afterAll(async () => {
  await Promise.all([
    EmployeeModel.deleteMany({}),
    LeaveTypeModel.deleteMany({}),
    LeaveRecordModel.deleteMany({}),
  ]);
});

describe("POST /api/v1/employees/[id]/leave-records", () => {
  it("returns 401 when there is no session", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { employeeId, elTypeId } = await seedEmployeeWithBalances(1, 0);
    const response = await POST(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/leave-records`, "POST", {
        leaveTypeId: elTypeId,
        startDate: "2026-01-10",
        endDate: "2026-01-10",
        halfDay: true,
      }),
      { params: Promise.resolve({ id: employeeId }) },
    );
    expect(response.status).toBe(401);
  });

  // End-to-end regression for the EL/VL fix: a half-day Emergency Leave
  // request against an unfunded EL balance must succeed through the real
  // HTTP route, not just the service function directly.
  it("logs a half-day EL request by drawing the shortfall from VL, through the real route", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const { employeeId, vlTypeId, elTypeId } = await seedEmployeeWithBalances(0.5, 0);

    const response = await POST(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/leave-records`, "POST", {
        leaveTypeId: elTypeId,
        startDate: "2026-01-10",
        endDate: "2026-01-10",
        halfDay: true,
      }),
      { params: Promise.resolve({ id: employeeId }) },
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.days).toBe(0.5);

    const employee = await EmployeeModel.findById(employeeId).lean<{
      leaveBalances: { leaveTypeId: string; balance: number }[];
    }>();
    const vlBalance = employee?.leaveBalances.find((b) => b.leaveTypeId === vlTypeId)?.balance;
    const elBalance = employee?.leaveBalances.find((b) => b.leaveTypeId === elTypeId)?.balance;
    expect(vlBalance).toBe(0);
    expect(elBalance).toBe(0);
  });

  it("returns 409 when neither EL nor VL has enough balance", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const { employeeId, elTypeId } = await seedEmployeeWithBalances(0, 0);

    const response = await POST(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/leave-records`, "POST", {
        leaveTypeId: elTypeId,
        startDate: "2026-01-10",
        endDate: "2026-01-10",
        halfDay: true,
      }),
      { params: Promise.resolve({ id: employeeId }) },
    );
    expect(response.status).toBe(409);
  });

  it("returns 403 for a role that cannot log leave", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const { employeeId, elTypeId } = await seedEmployeeWithBalances(1, 0);

    const response = await POST(
      jsonRequest(`http://localhost/api/v1/employees/${employeeId}/leave-records`, "POST", {
        leaveTypeId: elTypeId,
        startDate: "2026-01-10",
        endDate: "2026-01-10",
      }),
      { params: Promise.resolve({ id: employeeId }) },
    );
    expect(response.status).toBe(403);
  });
});
