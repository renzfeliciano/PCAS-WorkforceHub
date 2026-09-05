import { connectMongoDB } from "@/lib/mongodb";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { listEmployees } from "@/services/employee-service";
import { AttendanceModule } from "@/features/attendance/attendance-module";

const PAGE_SIZE = 10;

export default async function AttendancePage() {
  await connectMongoDB();
  const { items, total } = await listEmployees(new MongoEmployeeRepository(), {
    page: 1,
    pageSize: PAGE_SIZE,
    includeArchived: false,
  });
  return <AttendanceModule initialData={{ items, total }} />;
}
