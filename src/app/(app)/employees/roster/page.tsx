import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { connectMongoDB } from "@/lib/mongodb";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { MongoUserRepository } from "@/repositories/user-repository";
import { listEmployees } from "@/services/employee-service";
import { EmployeesModule } from "@/features/employees/employees-module";

const PAGE_SIZE = 10;

export default async function RosterPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) redirect("/login");

  await connectMongoDB();
  const { items, total } = await listEmployees(
    new MongoEmployeeRepository(),
    { role: session.user.role, employeeId: session.user.employeeId },
    { page: 1, pageSize: PAGE_SIZE, includeArchived: false },
  );
  const usernames = await new MongoUserRepository().findUsernamesByEmployeeIds(
    items.map((employee) => employee.id),
  );
  const decoratedItems = items.map((e) => ({ ...e, username: usernames.get(e.id) }));
  return <EmployeesModule initialData={{ items: decoratedItems, total }} />;
}
