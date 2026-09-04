import type { Employee, LeaveCredits } from "@/types/employee";

export class InMemoryEmployeeRepository {
  constructor(private readonly records: Employee[]) {}
  async findAll() {
    return this.records;
  }
  async updateLeaveCredits(id: string, leaveCredits: LeaveCredits) {
    const employee = this.records.find((record) => record.id === id);
    if (!employee) throw new Error("Employee not found");
    employee.leaveCredits = leaveCredits;
    return employee;
  }
}
