import { connectMongoDB } from "@/lib/mongodb";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { listEmployees } from "@/services/employee-service";
import { EmployeesModule } from "@/features/employees/employees-module";

const PAGE_SIZE = 10;

export default async function RosterPage() {
  await connectMongoDB();
  const { items, total } = await listEmployees(new MongoEmployeeRepository(), {
    page: 1,
    pageSize: PAGE_SIZE,
    includeArchived: false,
  });
  return <EmployeesModule initialData={{ items, total }} />;
}
