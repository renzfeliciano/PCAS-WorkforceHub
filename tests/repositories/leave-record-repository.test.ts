import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { connectMongoDB } from "@/lib/mongodb";
import { NotFoundError } from "@/lib/app-errors";
import { MongoLeaveRecordRepository } from "@/repositories/leave-record-repository";
import { LeaveRecordModel } from "@/repositories/models/leave-record-model";

const repository = new MongoLeaveRecordRepository();
const EMPLOYEE_ID = "507f1f77bcf86cd799439011";
const LEAVE_TYPE_ID = "507f1f77bcf86cd799439022";

beforeEach(async () => {
  await connectMongoDB();
  await LeaveRecordModel.deleteMany({});
});

afterAll(async () => {
  await LeaveRecordModel.deleteMany({});
});

describe("MongoLeaveRecordRepository.create / findByEmployee", () => {
  it("persists a record and finds it by employee", async () => {
    await repository.create(EMPLOYEE_ID, {
      leaveTypeId: LEAVE_TYPE_ID,
      startDate: "2026-01-10",
      endDate: "2026-01-10",
      days: 1,
    });

    const records = await repository.findByEmployee(EMPLOYEE_ID);
    expect(records).toHaveLength(1);
    expect(records[0].days).toBe(1);
  });

  it("only returns records for the requested employee", async () => {
    await repository.create(EMPLOYEE_ID, {
      leaveTypeId: LEAVE_TYPE_ID,
      startDate: "2026-01-10",
      endDate: "2026-01-10",
      days: 1,
    });
    await repository.create("507f1f77bcf86cd799439033", {
      leaveTypeId: LEAVE_TYPE_ID,
      startDate: "2026-01-11",
      endDate: "2026-01-11",
      days: 1,
    });

    const records = await repository.findByEmployee(EMPLOYEE_ID);
    expect(records).toHaveLength(1);
  });
});

describe("MongoLeaveRecordRepository.update / delete", () => {
  it("updates an existing record", async () => {
    const created = await repository.create(EMPLOYEE_ID, {
      leaveTypeId: LEAVE_TYPE_ID,
      startDate: "2026-01-10",
      endDate: "2026-01-10",
      days: 1,
    });
    const updated = await repository.update(created.id, {
      leaveTypeId: LEAVE_TYPE_ID,
      startDate: "2026-01-10",
      endDate: "2026-01-10",
      days: 0.5,
    });
    expect(updated.days).toBe(0.5);
  });

  it("throws NotFoundError updating a record that doesn't exist", async () => {
    await expect(
      repository.update("507f1f77bcf86cd799439099", {
        leaveTypeId: LEAVE_TYPE_ID,
        startDate: "2026-01-10",
        endDate: "2026-01-10",
        days: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deletes an existing record", async () => {
    const created = await repository.create(EMPLOYEE_ID, {
      leaveTypeId: LEAVE_TYPE_ID,
      startDate: "2026-01-10",
      endDate: "2026-01-10",
      days: 1,
    });
    await repository.delete(created.id);
    await expect(repository.findById(created.id)).resolves.toBeNull();
  });

  it("throws NotFoundError deleting a record that doesn't exist", async () => {
    await expect(repository.delete("507f1f77bcf86cd799439099")).rejects.toBeInstanceOf(NotFoundError);
  });
});
