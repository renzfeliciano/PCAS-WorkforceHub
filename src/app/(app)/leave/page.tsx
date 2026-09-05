import { connectMongoDB } from "@/lib/mongodb";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { listEmployees } from "@/services/employee-service";
import { LeaveModule } from "@/features/leave/leave-module";

const PAGE_SIZE = 10;

export default async function LeavePage() {
  await connectMongoDB();
  const { items, total } = await listEmployees(new MongoEmployeeRepository(), {
    page: 1,
    pageSize: PAGE_SIZE,
    includeArchived: false,
  });
  return <LeaveModule initialData={{ items, total }} />;
}
