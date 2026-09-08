import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectMongoDB } from "@/lib/mongodb";
import { ConflictError } from "@/lib/app-errors";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { EmployeeModel } from "@/repositories/models/employee-model";
import type { EmployeeInput } from "@/schemas/employee";

const repository = new MongoEmployeeRepository();

beforeAll(async () => {
  await connectMongoDB();
  // See tests/repositories/setting-repository.test.ts — the unique
  // employeeNumber index builds asynchronously in the background, so the
  // duplicate-key test below needs to wait for it explicitly.
  await EmployeeModel.init();
});

function makeInput(overrides: Partial<EmployeeInput> = {}): EmployeeInput {
  return {
    employeeNumber: "001",
    name: "Alice Smith",
    gender: "Female",
    position: "Engineer",
    projectSite: "HO",
    dateHired: "2020-01-01",
    employmentStatus: "Regular",
    leaveBalances: [],
    ...overrides,
  };
}

beforeEach(async () => {
  await connectMongoDB();
  await repository.deleteAll();
});

afterAll(async () => {
  await repository.deleteAll();
});

describe("MongoEmployeeRepository.create", () => {
  it("persists and round-trips an employee", async () => {
    const created = await repository.create(makeInput());
    const found = await repository.findById(created.id);
    expect(found?.name).toBe("Alice Smith");
    expect(found?.archived).toBe(false);
  });

  it("rejects a duplicate employee number with ConflictError, not a raw Mongo error", async () => {
    await repository.create(makeInput({ employeeNumber: "001" }));
    await expect(repository.create(makeInput({ employeeNumber: "001", name: "Someone Else" }))).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});

describe("MongoEmployeeRepository.findAll — search", () => {
  it("finds by a case-insensitive partial match on name", async () => {
    await repository.create(makeInput({ employeeNumber: "001", name: "Alice Smith" }));
    await repository.create(makeInput({ employeeNumber: "002", name: "Bob Jones" }));

    const result = await repository.findAll({ query: "alice" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Alice Smith");
  });

  // The actual point of escapeRegex(): a search string containing regex
  // metacharacters must be treated as a literal substring, not compiled as
  // a regex pattern — otherwise a search like "C++" (a real job title
  // fragment) would throw or match unintended records.
  it("treats regex metacharacters in the search query as literal text", async () => {
    await repository.create(makeInput({ employeeNumber: "001", name: "Alice Smith", position: "C++ Engineer" }));
    await repository.create(makeInput({ employeeNumber: "002", name: "Bob Jones", position: "Engineer" }));

    const result = await repository.findAll({ query: "C++" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].position).toBe("C++ Engineer");
  });

  it("does not throw on a search string that would be an invalid regex if unescaped", async () => {
    await repository.create(makeInput({ employeeNumber: "001", name: "Alice Smith" }));
    await expect(repository.findAll({ query: "(unclosed" })).resolves.toBeDefined();
  });

  it("excludes archived employees by default and includes them when asked", async () => {
    const created = await repository.create(makeInput({ employeeNumber: "001" }));
    await repository.archive(created.id);

    const activeOnly = await repository.findAll({});
    expect(activeOnly.items).toHaveLength(0);

    const withArchived = await repository.findAll({ includeArchived: true });
    expect(withArchived.items).toHaveLength(1);
  });
});

describe("MongoEmployeeRepository.update", () => {
  it("clears a field when the patch explicitly sends null (not just omits it)", async () => {
    const created = await repository.create(
      makeInput({ employmentStatus: "Contractual", endOfContract: "2026-12-31" }),
    );
    expect((await repository.findById(created.id))?.endOfContract).toBe("2026-12-31");

    await repository.update(created.id, { employmentStatus: "Regular", endOfContract: null });

    const updated = await repository.findById(created.id);
    expect(updated?.endOfContract).toBeUndefined();
  });
});
