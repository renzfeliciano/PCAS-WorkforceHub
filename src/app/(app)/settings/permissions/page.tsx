import { withRoleGuard } from "@/lib/with-role-guard";
import { isDataResetEnabled } from "@/lib/seed-flags";
import { connectMongoDB } from "@/lib/mongodb";
import { MongoUserRepository } from "@/repositories/user-repository";
import { listUsers } from "@/services/user-service";
import { PermissionsModule } from "@/features/permissions/permissions-module";

const PAGE_SIZE = 10;

export default async function PermissionsPage() {
  await withRoleGuard(["Admin", "HR"]);
  await connectMongoDB();
  const { items, total } = await listUsers(new MongoUserRepository(), {
    page: 1,
    pageSize: PAGE_SIZE,
  });
  return (
    <PermissionsModule
      dataResetEnabled={isDataResetEnabled()}
      initialData={{ items, total }}
    />
  );
}
