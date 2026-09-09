import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectMongoDB } from "@/lib/mongodb";
import { ConflictError, NotFoundError } from "@/lib/app-errors";
import { MongoAttendanceRecordRepository } from "@/repositories/attendance-record-repository";
import { MongoSettingRepository } from "@/repositories/setting-repository";
import { AttendanceRecordModel } from "@/repositories/models/attendance-record-model";
import { ATTENDANCE_STATUS_CATEGORY } from "@/types/settings";

const repository = new MongoAttendanceRecordRepository();
const settings = new MongoSettingRepository();
const EMPLOYEE_ID = "507f1f77bcf86cd799439011";

beforeAll(async () => {
  // connectMongoDB() now guarantees every model's indexes (including the
  // unique {employeeId,date} one the test below depends on) are built
  // before it resolves — see src/lib/mongodb.ts.
  await connectMongoDB();
});

async function makeStatus(name: string) {
  return (await settings.create({ name, kind: "status", category: ATTENDANCE_STATUS_CATEGORY })).id;
}

beforeEach(async () => {
  await AttendanceRecordModel.deleteMany({});
  await settings.deleteAll();
});

afterAll(async () => {
  await AttendanceRecordModel.deleteMany({});
  await settings.deleteAll();
});

describe("MongoAttendanceRecordRepository.create", () => {
  it("persists a record for an employee, resolving status from the catalog", async () => {
    const statusId = await makeStatus("Present");
    const record = await repository.create(EMPLOYEE_ID, { date: "2026-01-10", statusId });
    expect(record.employeeId).toBe(EMPLOYEE_ID);
    expect(record.status).toBe("Present");
  });

  it("rejects a second record for the same employee on the same date as ConflictError", async () => {
    const statusId = await makeStatus("Present");
    await repository.create(EMPLOYEE_ID, { date: "2026-01-10", statusId });
    await expect(
      repository.create(EMPLOYEE_ID, { date: "2026-01-10", statusId: await makeStatus("Late") }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("allows the same employee to have records on different dates", async () => {
    const statusId = await makeStatus("Present");
    await repository.create(EMPLOYEE_ID, { date: "2026-01-10", statusId });
    await expect(
      repository.create(EMPLOYEE_ID, { date: "2026-01-11", statusId }),
    ).resolves.toBeDefined();
  });

  it("allows different employees to have records on the same date", async () => {
    const statusId = await makeStatus("Present");
    await repository.create(EMPLOYEE_ID, { date: "2026-01-10", statusId });
    await expect(
      repository.create("507f1f77bcf86cd799439012", { date: "2026-01-10", statusId }),
    ).resolves.toBeDefined();
  });
});

describe("MongoAttendanceRecordRepository — catalog rename reflects live", () => {
  it("shows a renamed status immediately, without touching the attendance record", async () => {
    const statusId = await makeStatus("Tardy / Late");
    const created = await repository.create(EMPLOYEE_ID, { date: "2026-01-10", statusId });

    await settings.update(statusId, { name: "Late Arrival" });

    const found = await repository.findById(created.id);
    expect(found?.status).toBe("Late Arrival");
  });
});

describe("MongoAttendanceRecordRepository.findByEmployeeAndRange", () => {
  it("only returns records within the given date range", async () => {
    const statusId = await makeStatus("Present");
    await repository.create(EMPLOYEE_ID, { date: "2026-01-05", statusId });
    await repository.create(EMPLOYEE_ID, { date: "2026-01-15", statusId });
    await repository.create(EMPLOYEE_ID, { date: "2026-02-01", statusId });

    const januaryRecords = await repository.findByEmployeeAndRange(EMPLOYEE_ID, "2026-01-01", "2026-01-31");
    expect(januaryRecords).toHaveLength(2);
  });
});

describe("MongoAttendanceRecordRepository.update / delete", () => {
  it("throws NotFoundError updating a record that doesn't exist", async () => {
    await expect(
      repository.update("507f1f77bcf86cd799439099", { statusId: await makeStatus("Absent") }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError deleting a record that doesn't exist", async () => {
    await expect(repository.delete("507f1f77bcf86cd799439099")).rejects.toBeInstanceOf(NotFoundError);
  });
});
