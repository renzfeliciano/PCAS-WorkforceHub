import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectMongoDB } from "@/lib/mongodb";
import { ConflictError, NotFoundError } from "@/lib/app-errors";
import { MongoAttendanceRecordRepository } from "@/repositories/attendance-record-repository";
import { AttendanceRecordModel } from "@/repositories/models/attendance-record-model";

const repository = new MongoAttendanceRecordRepository();
const EMPLOYEE_ID = "507f1f77bcf86cd799439011";

beforeAll(async () => {
  await connectMongoDB();
  // See tests/repositories/setting-repository.test.ts — the unique
  // {employeeId, date} index builds asynchronously in the background.
  await AttendanceRecordModel.init();
});

beforeEach(async () => {
  await AttendanceRecordModel.deleteMany({});
});

afterAll(async () => {
  await AttendanceRecordModel.deleteMany({});
});

describe("MongoAttendanceRecordRepository.create", () => {
  it("persists a record for an employee", async () => {
    const record = await repository.create(EMPLOYEE_ID, { date: "2026-01-10", status: "Present" });
    expect(record.employeeId).toBe(EMPLOYEE_ID);
    expect(record.status).toBe("Present");
  });

  it("rejects a second record for the same employee on the same date as ConflictError", async () => {
    await repository.create(EMPLOYEE_ID, { date: "2026-01-10", status: "Present" });
    await expect(
      repository.create(EMPLOYEE_ID, { date: "2026-01-10", status: "Late" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("allows the same employee to have records on different dates", async () => {
    await repository.create(EMPLOYEE_ID, { date: "2026-01-10", status: "Present" });
    await expect(
      repository.create(EMPLOYEE_ID, { date: "2026-01-11", status: "Present" }),
    ).resolves.toBeDefined();
  });

  it("allows different employees to have records on the same date", async () => {
    await repository.create(EMPLOYEE_ID, { date: "2026-01-10", status: "Present" });
    await expect(
      repository.create("507f1f77bcf86cd799439012", { date: "2026-01-10", status: "Present" }),
    ).resolves.toBeDefined();
  });
});

describe("MongoAttendanceRecordRepository.findByEmployeeAndRange", () => {
  it("only returns records within the given date range", async () => {
    await repository.create(EMPLOYEE_ID, { date: "2026-01-05", status: "Present" });
    await repository.create(EMPLOYEE_ID, { date: "2026-01-15", status: "Present" });
    await repository.create(EMPLOYEE_ID, { date: "2026-02-01", status: "Present" });

    const januaryRecords = await repository.findByEmployeeAndRange(EMPLOYEE_ID, "2026-01-01", "2026-01-31");
    expect(januaryRecords).toHaveLength(2);
  });
});

describe("MongoAttendanceRecordRepository.update / delete", () => {
  it("throws NotFoundError updating a record that doesn't exist", async () => {
    await expect(repository.update("507f1f77bcf86cd799439099", { status: "Absent" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("throws NotFoundError deleting a record that doesn't exist", async () => {
    await expect(repository.delete("507f1f77bcf86cd799439099")).rejects.toBeInstanceOf(NotFoundError);
  });
});
