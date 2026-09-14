import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { connectMongoDB } from "@/lib/mongodb";
import { TravelOrderModel } from "@/repositories/models/travel-order-model";
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

const { GET, POST } = await import("@/app/api/v1/travel-orders/route");
const { PATCH, DELETE } = await import("@/app/api/v1/travel-orders/[id]/route");

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
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
  await TravelOrderModel.deleteMany({});
  await EmployeeModel.deleteMany({});
});

afterAll(async () => {
  await TravelOrderModel.deleteMany({});
  await EmployeeModel.deleteMany({});
});

describe("GET /api/v1/travel-orders", () => {
  it("returns 401 when there is no session", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const response = await GET(jsonRequest("http://localhost/api/v1/travel-orders", "GET"));
    expect(response.status).toBe(401);
  });

  it("returns a paginated shape for Admin/HR", async () => {
    const employeeId = await makeEmployee();
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    await POST(
      jsonRequest("http://localhost/api/v1/travel-orders", "POST", {
        employeeIds: [employeeId],
        startDate: "2026-02-01",
        endDate: "2026-02-03",
      }),
    );

    const response = await GET(jsonRequest("http://localhost/api/v1/travel-orders?page=1&pageSize=20", "GET"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
  });

  it("returns 403 for Employee — travel orders are Admin/HR only", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await GET(jsonRequest("http://localhost/api/v1/travel-orders?page=1&pageSize=20", "GET"));
    expect(response.status).toBe(403);
  });
});

describe("POST /api/v1/travel-orders", () => {
  it("returns 403 for a role that cannot manage travel orders", async () => {
    const employeeId = await makeEmployee();
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await POST(
      jsonRequest("http://localhost/api/v1/travel-orders", "POST", {
        employeeIds: [employeeId],
        startDate: "2026-02-01",
        endDate: "2026-02-03",
      }),
    );
    expect(response.status).toBe(403);
  });

  it("returns 404 for a dispatch referencing an employee that doesn't exist", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const response = await POST(
      jsonRequest("http://localhost/api/v1/travel-orders", "POST", {
        employeeIds: ["507f1f77bcf86cd799439099"],
        startDate: "2026-02-01",
        endDate: "2026-02-03",
      }),
    );
    expect(response.status).toBe(404);
  });
});

describe("PATCH/DELETE /api/v1/travel-orders/[id]", () => {
  async function seedTravelOrder() {
    const employeeId = await makeEmployee();
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const created = await POST(
      jsonRequest("http://localhost/api/v1/travel-orders", "POST", {
        employeeIds: [employeeId],
        startDate: "2026-02-01",
        endDate: "2026-02-03",
      }),
    );
    return { id: (await created.json()).id as string, employeeId };
  }

  it("updates a travel order for HR", async () => {
    const { id, employeeId } = await seedTravelOrder();
    const response = await PATCH(
      jsonRequest(`http://localhost/api/v1/travel-orders/${id}`, "PATCH", {
        employeeIds: [employeeId],
        startDate: "2026-02-01",
        endDate: "2026-02-05",
      }),
      { params: Promise.resolve({ id }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.endDate).toBe("2026-02-05");
  });

  it("deletes a travel order for Admin", async () => {
    const { id } = await seedTravelOrder();
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const response = await DELETE(
      jsonRequest(`http://localhost/api/v1/travel-orders/${id}`, "DELETE"),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    await expect(TravelOrderModel.findById(id)).resolves.toBeNull();
  });
});
