import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { connectMongoDB } from "@/lib/mongodb";
import { NotFoundError } from "@/lib/app-errors";
import { MongoTravelOrderRepository } from "@/repositories/travel-order-repository";
import { TravelOrderModel } from "@/repositories/models/travel-order-model";
import { EmployeeModel } from "@/repositories/models/employee-model";

const repository = new MongoTravelOrderRepository();

async function makeEmployee(name: string) {
  const doc = await EmployeeModel.create({
    name,
    gender: "Male",
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

describe("MongoTravelOrderRepository.create / findAll", () => {
  it("persists a travel order and resolves employee names live", async () => {
    const employeeId = await makeEmployee("Alice Reyes");
    const created = await repository.create({
      employeeIds: [employeeId],
      startDate: "2026-02-01",
      endDate: "2026-02-03",
    });
    expect(created.employees).toEqual([
      { employeeId, employeeNumber: undefined, name: "Alice Reyes" },
    ]);

    const result = await repository.findAll({ page: 1, pageSize: 20 });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  // Regression test: findAll() used to return only the most recent 200
  // orders with a fixed .limit() and no way to reach anything older — real
  // pagination (skip/limit + total) replaces that silent cutoff.
  it("pages through results instead of silently capping them", async () => {
    const employeeId = await makeEmployee("Alice Reyes");
    for (let i = 0; i < 5; i += 1) {
      await repository.create({
        employeeIds: [employeeId],
        startDate: `2026-02-0${i + 1}`,
        endDate: `2026-02-0${i + 1}`,
      });
    }

    const firstPage = await repository.findAll({ page: 1, pageSize: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.total).toBe(5);
    expect(firstPage.page).toBe(1);
    expect(firstPage.pageSize).toBe(2);

    const lastPage = await repository.findAll({ page: 3, pageSize: 2 });
    expect(lastPage.items).toHaveLength(1);
  });

  it("shows a fallback value for a deleted employee instead of dropping the entry", async () => {
    const employeeId = await makeEmployee("Alice Reyes");
    await repository.create({
      employeeIds: [employeeId],
      startDate: "2026-02-01",
      endDate: "2026-02-03",
    });
    await EmployeeModel.deleteMany({});

    const result = await repository.findAll({ page: 1, pageSize: 20 });
    expect(result.items[0].employees).toEqual([
      { employeeId, employeeNumber: "—", name: "—" },
    ]);
  });
});

describe("MongoTravelOrderRepository.update / delete", () => {
  it("updates an existing travel order", async () => {
    const employeeId = await makeEmployee("Alice Reyes");
    const created = await repository.create({
      employeeIds: [employeeId],
      startDate: "2026-02-01",
      endDate: "2026-02-03",
    });
    const updated = await repository.update(created.id, {
      employeeIds: [employeeId],
      startDate: "2026-02-01",
      endDate: "2026-02-05",
    });
    expect(updated.endDate).toBe("2026-02-05");
  });

  it("throws NotFoundError updating a travel order that doesn't exist", async () => {
    const employeeId = await makeEmployee("Alice Reyes");
    await expect(
      repository.update("507f1f77bcf86cd799439099", {
        employeeIds: [employeeId],
        startDate: "2026-02-01",
        endDate: "2026-02-03",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deletes an existing travel order", async () => {
    const employeeId = await makeEmployee("Alice Reyes");
    const created = await repository.create({
      employeeIds: [employeeId],
      startDate: "2026-02-01",
      endDate: "2026-02-03",
    });
    await repository.delete(created.id);
    await expect(repository.findById(created.id)).resolves.toBeNull();
  });

  it("throws NotFoundError deleting a travel order that doesn't exist", async () => {
    await expect(repository.delete("507f1f77bcf86cd799439099")).rejects.toBeInstanceOf(NotFoundError);
  });
});
