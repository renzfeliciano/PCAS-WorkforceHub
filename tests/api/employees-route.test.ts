import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { connectMongoDB } from "@/lib/mongodb";
import { EmployeeModel } from "@/repositories/models/employee-model";
import type { Role } from "@/types/user";

// requireApiSession() calls next-auth's getServerSession(authOptions)
// directly — mocking it here is enough to control "who's calling this
// route" without needing a real cookie/JWT. Everything below that
// (rate limiter, MongoDB, the service layer) is the real thing, sharing
// the in-memory MongoDB started once for the whole suite in
// tests/global-setup.ts — this is genuinely exercising the route handler's
// own wiring (auth guard -> validation -> service -> response shape), not
// a re-test of logic already covered by the service-layer tests.
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

// Imported after the mock is registered so the route module picks it up.
const { GET, POST } = await import("@/app/api/v1/employees/route");

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function validEmployeeInput(overrides: Record<string, unknown> = {}) {
  return {
    employeeNumber: "001",
    name: "Alice Smith",
    gender: "Female",
    positionId: "pos-1",
    projectSiteId: "proj-1",
    dateHired: "2020-01-01",
    employmentStatusId: "status-1",
    employmentStatusName: "Regular",
    ...overrides,
  };
}

beforeAll(async () => {
  // connectMongoDB() now guarantees every model's indexes (including the
  // unique employeeNumber one the duplicate-key test below depends on) are
  // built before it resolves — see src/lib/mongodb.ts.
  await connectMongoDB();
});

beforeEach(async () => {
  await EmployeeModel.deleteMany({});
});

afterAll(async () => {
  await EmployeeModel.deleteMany({});
});

describe("GET /api/v1/employees", () => {
  it("returns 401 when there is no session", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const response = await GET(jsonRequest("http://localhost/api/v1/employees", "GET"));
    expect(response.status).toBe(401);
  });

  it("returns 200 with the created employee for an authenticated request", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    await POST(jsonRequest("http://localhost/api/v1/employees", "POST", validEmployeeInput()));

    const response = await GET(jsonRequest("http://localhost/api/v1/employees", "GET"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe("Alice Smith");
  });

  it("carries the request id as a response header", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const response = await GET(jsonRequest("http://localhost/api/v1/employees", "GET"));
    expect(response.headers.get("X-Request-Id")).toBeTruthy();
  });

  it("filters by projectId", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    await POST(
      jsonRequest("http://localhost/api/v1/employees", "POST", validEmployeeInput({ projectSiteId: "proj-1" })),
    );
    await POST(
      jsonRequest(
        "http://localhost/api/v1/employees",
        "POST",
        validEmployeeInput({ employeeNumber: "002", name: "Bob Jones", projectSiteId: "proj-2" }),
      ),
    );

    const response = await GET(
      jsonRequest("http://localhost/api/v1/employees?projectId=proj-2", "GET"),
    );
    const body = await response.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe("Bob Jones");
  });
});

describe("GET /api/v1/employees — project scoping for Manager/Employee", () => {
  it("scopes a plain Employee/Manager to only their own project, ignoring any requested projectId", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const own = await POST(
      jsonRequest("http://localhost/api/v1/employees", "POST", validEmployeeInput({ projectSiteId: "proj-1" })),
    );
    const ownId = (await own.json()).id as string;
    await POST(
      jsonRequest(
        "http://localhost/api/v1/employees",
        "POST",
        validEmployeeInput({ employeeNumber: "002", name: "Bob Jones", projectSiteId: "proj-2" }),
      ),
    );

    getServerSessionMock.mockResolvedValue(sessionFor("Employee", ownId));
    const response = await GET(
      jsonRequest("http://localhost/api/v1/employees?projectId=proj-2", "GET"),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe("Alice Smith");
  });

  it("returns an empty roster for a Manager/Employee account with no linked employee record", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    await POST(jsonRequest("http://localhost/api/v1/employees", "POST", validEmployeeInput()));

    getServerSessionMock.mockResolvedValue(sessionFor("Manager"));
    const response = await GET(jsonRequest("http://localhost/api/v1/employees", "GET"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(0);
  });
});

describe("POST /api/v1/employees", () => {
  it("returns 403 for a role that cannot create employees", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await POST(
      jsonRequest("http://localhost/api/v1/employees", "POST", validEmployeeInput()),
    );
    expect(response.status).toBe(403);
  });

  it("returns 400 with a validation-error shape for a malformed body", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const response = await POST(
      jsonRequest("http://localhost/api/v1/employees", "POST", { name: "" }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("creates an employee and returns 201 for HR", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const response = await POST(
      jsonRequest("http://localhost/api/v1/employees", "POST", validEmployeeInput()),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.employeeNumber).toBe("001");

    const count = await EmployeeModel.countDocuments();
    expect(count).toBe(1);
  });

  it("returns 409 for a duplicate employee number", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    await POST(jsonRequest("http://localhost/api/v1/employees", "POST", validEmployeeInput()));

    const response = await POST(
      jsonRequest("http://localhost/api/v1/employees", "POST", validEmployeeInput({ name: "Someone Else" })),
    );
    expect(response.status).toBe(409);
  });
});
