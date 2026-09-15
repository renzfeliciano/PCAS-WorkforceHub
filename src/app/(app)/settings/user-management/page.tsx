import { withRoleGuard } from "@/lib/with-role-guard";
import { isDataResetEnabled } from "@/lib/seed-flags";
import { connectMongoDB } from "@/lib/mongodb";
import { MongoUserRepository } from "@/repositories/user-repository";
import { listUsers } from "@/services/user-service";
import { UserManagementModule } from "@/features/user-management/user-management-module";

const PAGE_SIZE = 10;

export default async function UserManagementPage() {
  await withRoleGuard(["Admin", "HR"]);
  await connectMongoDB();
  const { items, total } = await listUsers(new MongoUserRepository(), {
    page: 1,
    pageSize: PAGE_SIZE,
  });
  return (
    <UserManagementModule
      dataResetEnabled={isDataResetEnabled()}
      initialData={{ items, total }}
    />
  );
}
