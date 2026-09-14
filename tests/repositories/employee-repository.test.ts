import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectMongoDB } from "@/lib/mongodb";
import { ConflictError } from "@/lib/app-errors";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { EmployeeModel } from "@/repositories/models/employee-model";
import { MongoSettingRepository } from "@/repositories/setting-repository";
import type { EmployeeInput } from "@/schemas/employee";

const repository = new MongoEmployeeRepository();
const settings = new MongoSettingRepository();

beforeAll(async () => {
  // connectMongoDB() itself now guarantees every model's indexes (including
  // the unique employeeNumber one the duplicate-key test below depends on)
  // are built before it resolves — see src/lib/mongodb.ts.
  await connectMongoDB();
});

async function makePosition(name: string) {
  return (await settings.create({ name, kind: "position" })).id;
}

async function makeProject(name: string) {
  return (await settings.create({ name, kind: "project" })).id;
}

async function makeStatus(name: string) {
  return (await settings.create({ name, kind: "status", category: "employment" })).id;
}

function makeInput(overrides: Partial<EmployeeInput> = {}): EmployeeInput {
  return {
    employeeNumber: "001",
    name: "Alice Smith",
    gender: "Female",
    userRole: "Employee",
    positionId: "",
    projectSiteId: "",
    dateHired: "2020-01-01",
    employmentStatusId: "status-regular",
    employmentStatusName: "Regular",
    leaveBalances: [],
    ...overrides,
  };
}

beforeEach(async () => {
  await connectMongoDB();
  await repository.deleteAll();
  await settings.deleteAll();
});

afterAll(async () => {
  await repository.deleteAll();
  await settings.deleteAll();
});

describe("MongoEmployeeRepository reading a legacy document with no userRole field", () => {
  it("defaults userRole to Employee for a document saved before that field existed", async () => {
    const positionId = await makePosition("Engineer");
    const projectSiteId = await makeProject("HO");
    // Bypasses the Mongoose schema (which would apply the default) to
    // reproduce a document written before userRole was added — the exact
    // shape .lean() returns for every pre-existing roster employee.
    const { insertedId } = await EmployeeModel.collection.insertOne({
      name: "Legacy Employee",
      gender: "Female",
      positionId,
      projectSiteId,
      dateHired: "2020-01-01",
      employmentStatusId: "status-1",
      leaveBalances: [],
      archived: false,
      createdAt: new Date(),
    });

    const found = await repository.findById(insertedId.toString());
    expect(found?.userRole).toBe("Employee");

    const { items } = await repository.findAll({ includeArchived: false });
    expect(items.find((e) => e.id === insertedId.toString())?.userRole).toBe("Employee");
  });
});

describe("MongoEmployeeRepository.create", () => {
  it("persists and round-trips an employee, resolving position/projectSite from the catalog", async () => {
    const positionId = await makePosition("Engineer");
    const projectSiteId = await makeProject("HO");
    const created = await repository.create(makeInput({ positionId, projectSiteId }));
    expect(created.position).toBe("Engineer");
    expect(created.projectSite).toBe("HO");

    const found = await repository.findById(created.id);
    expect(found?.name).toBe("Alice Smith");
    expect(found?.positionId).toBe(positionId);
    expect(found?.position).toBe("Engineer");
    expect(found?.projectSite).toBe("HO");
    expect(found?.archived).toBe(false);
  });

  it("rejects a duplicate employee number with ConflictError, not a raw Mongo error", async () => {
    const positionId = await makePosition("Engineer");
    const projectSiteId = await makeProject("HO");
    await repository.create(makeInput({ employeeNumber: "001", positionId, projectSiteId }));
    await expect(
      repository.create(makeInput({ employeeNumber: "001", name: "Someone Else", positionId, projectSiteId })),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("allows multiple employees with no employee number at all", async () => {
    const positionId = await makePosition("Engineer");
    const projectSiteId = await makeProject("HO");
    await expect(
      repository.create(
        makeInput({ employeeNumber: undefined, name: "No Number One", positionId, projectSiteId }),
      ),
    ).resolves.toBeDefined();
    await expect(
      repository.create(
        makeInput({ employeeNumber: undefined, name: "No Number Two", positionId, projectSiteId }),
      ),
    ).resolves.toBeDefined();
  });
});

describe("MongoEmployeeRepository — catalog rename reflects live", () => {
  it("shows a renamed position/project/status immediately, without touching the employee document", async () => {
    const positionId = await makePosition("Site Engineer");
    const projectSiteId = await makeProject("Rufino Tower");
    const employmentStatusId = await makeStatus("Contractual");
    const created = await repository.create(makeInput({ positionId, projectSiteId, employmentStatusId }));

    await settings.update(positionId, { name: "Field Engineer" });
    await settings.update(projectSiteId, { name: "Rufino Plaza" });
    await settings.update(employmentStatusId, { name: "Contract-based" });

    const found = await repository.findById(created.id);
    expect(found?.position).toBe("Field Engineer");
    expect(found?.projectSite).toBe("Rufino Plaza");
    expect(found?.employmentStatus).toBe("Contract-based");

    const list = await repository.findAll({});
    expect(list.items[0].position).toBe("Field Engineer");
    expect(list.items[0].projectSite).toBe("Rufino Plaza");
    expect(list.items[0].employmentStatus).toBe("Contract-based");

    const dashboard = await repository.findActiveForDashboard();
    expect(dashboard[0].position).toBe("Field Engineer");
    expect(dashboard[0].projectSite).toBe("Rufino Plaza");
    expect(dashboard[0].employmentStatus).toBe("Contract-based");
  });

  it("shows a fallback value for a catalog entry that's since been deleted, rather than an empty string", async () => {
    const positionId = await makePosition("Temp Position");
    const projectSiteId = await makeProject("HO");
    const created = await repository.create(makeInput({ positionId, projectSiteId }));

    await settings.delete(positionId);

    const found = await repository.findById(created.id);
    expect(found?.position).toBe("—");

    const list = await repository.findAll({});
    expect(list.items[0].position).toBe("—");
  });
});

describe("MongoEmployeeRepository.findAll — search", () => {
  it("finds by a case-insensitive partial match on name", async () => {
    const positionId = await makePosition("Engineer");
    const projectSiteId = await makeProject("HO");
    await repository.create(makeInput({ employeeNumber: "001", name: "Alice Smith", positionId, projectSiteId }));
    await repository.create(makeInput({ employeeNumber: "002", name: "Bob Jones", positionId, projectSiteId }));

    const result = await repository.findAll({ query: "alice" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Alice Smith");
  });

  it("finds by a partial match on the resolved position name, not the raw id", async () => {
    const cppPositionId = await makePosition("C++ Engineer");
    const otherPositionId = await makePosition("Engineer");
    const projectSiteId = await makeProject("HO");
    await repository.create(
      makeInput({ employeeNumber: "001", name: "Alice Smith", positionId: cppPositionId, projectSiteId }),
    );
    await repository.create(
      makeInput({ employeeNumber: "002", name: "Bob Jones", positionId: otherPositionId, projectSiteId }),
    );

    // The actual point of escapeRegex(): a search string containing regex
    // metacharacters must be treated as a literal substring, not compiled
    // as a regex pattern — otherwise a search like "C++" (a real job title
    // fragment) would throw or match unintended records.
    const result = await repository.findAll({ query: "C++" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].position).toBe("C++ Engineer");
  });

  it("does not throw on a search string that would be an invalid regex if unescaped", async () => {
    const positionId = await makePosition("Engineer");
    const projectSiteId = await makeProject("HO");
    await repository.create(makeInput({ employeeNumber: "001", positionId, projectSiteId }));
    await expect(repository.findAll({ query: "(unclosed" })).resolves.toBeDefined();
  });

  it("filters by employment status id", async () => {
    const positionId = await makePosition("Engineer");
    const projectSiteId = await makeProject("HO");
    const regularId = await makeStatus("Regular");
    const contractualId = await makeStatus("Contractual");
    await repository.create(
      makeInput({ employeeNumber: "001", name: "Alice", positionId, projectSiteId, employmentStatusId: regularId }),
    );
    await repository.create(
      makeInput({ employeeNumber: "002", name: "Bob", positionId, projectSiteId, employmentStatusId: contractualId }),
    );

    const result = await repository.findAll({ status: [contractualId] });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Bob");
    expect(result.items[0].employmentStatus).toBe("Contractual");
  });

  it("filters by project site id", async () => {
    const positionId = await makePosition("Engineer");
    const rufinoId = await makeProject("Rufino Tower");
    const insulaId = await makeProject("South Insula");
    await repository.create(
      makeInput({ employeeNumber: "001", name: "Alice", positionId, projectSiteId: rufinoId }),
    );
    await repository.create(
      makeInput({ employeeNumber: "002", name: "Bob", positionId, projectSiteId: insulaId }),
    );

    const result = await repository.findAll({ projectId: insulaId });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Bob");
    expect(result.items[0].projectSite).toBe("South Insula");
  });

  it("excludes archived employees by default and includes them when asked", async () => {
    const positionId = await makePosition("Engineer");
    const projectSiteId = await makeProject("HO");
    const created = await repository.create(makeInput({ employeeNumber: "001", positionId, projectSiteId }));
    await repository.archive(created.id);

    const activeOnly = await repository.findAll({});
    expect(activeOnly.items).toHaveLength(0);

    const withArchived = await repository.findAll({ includeArchived: true });
    expect(withArchived.items).toHaveLength(1);
  });
});

describe("MongoEmployeeRepository.findAll — sort", () => {
  it("sorts by the resolved position name, not the underlying catalog id", async () => {
    // Created in an order where the raw ObjectId ordering (roughly
    // creation-time-ordered) is the opposite of alphabetical name order —
    // sorting on the id instead of the resolved name would pass this
    // backwards.
    const zId = await makePosition("Zzz Position");
    const aId = await makePosition("Aaa Position");
    const projectSiteId = await makeProject("HO");
    await repository.create(
      makeInput({ employeeNumber: "001", name: "First", positionId: zId, projectSiteId }),
    );
    await repository.create(
      makeInput({ employeeNumber: "002", name: "Second", positionId: aId, projectSiteId }),
    );

    const result = await repository.findAll({ sortBy: "position", sortDir: "asc" });
    expect(result.items.map((employee) => employee.position)).toEqual([
      "Aaa Position",
      "Zzz Position",
    ]);
  });
});

describe("MongoEmployeeRepository.update", () => {
  it("clears a field when the patch explicitly sends null (not just omits it)", async () => {
    const positionId = await makePosition("Engineer");
    const projectSiteId = await makeProject("HO");
    const created = await repository.create(
      makeInput({ positionId, projectSiteId, employmentStatusId: "status-contractual", endOfContract: "2026-12-31" }),
    );
    expect((await repository.findById(created.id))?.endOfContract).toBe("2026-12-31");

    await repository.update(created.id, { employmentStatusId: "status-regular", endOfContract: null });

    const updated = await repository.findById(created.id);
    expect(updated?.endOfContract).toBeUndefined();
  });
});
