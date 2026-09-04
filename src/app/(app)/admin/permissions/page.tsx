import { withRoleGuard } from "@/lib/with-role-guard";
import { isDataResetEnabled } from "@/lib/seed-flags";
import { connectMongoDB } from "@/lib/mongodb";
import { MongoUserRepository } from "@/repositories/user-repository";
import { listUsers } from "@/services/user-service";
import { PermissionsModule } from "@/features/permissions/permissions-module";

export default async function PermissionsPage() {
  await withRoleGuard(["Admin"]);
  await connectMongoDB();
  const initialUsers = await listUsers(new MongoUserRepository());
  return (
    <PermissionsModule
      dataResetEnabled={isDataResetEnabled()}
      initialUsers={initialUsers}
    />
  );
}
