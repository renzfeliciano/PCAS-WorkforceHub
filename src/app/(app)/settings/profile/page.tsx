import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { MyProfileModule } from "@/features/profile/components/my-profile-module";

export default async function MyProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) redirect("/login");

  return (
    <MyProfileModule
      name={session.user.name ?? "User"}
      username={session.user.username}
      role={session.user.role}
      mustChangePassword={session.user.mustChangePassword}
    />
  );
}
