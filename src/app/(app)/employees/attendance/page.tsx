import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { connectMongoDB } from "@/lib/mongodb";
import { buildAttendanceActor } from "@/lib/attendance-actor";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { MongoSettingRepository } from "@/repositories/setting-repository";
import { AttendanceModule } from "@/features/attendance/attendance-module";

const employeeRepository = new MongoEmployeeRepository();
const settingRepository = new MongoSettingRepository();

// HR/Admin get the searchable list of every employee's attendance, scoped to
// everyone. A self-service employee (e.g. a Building Administrator) gets the
// same searchable list, but scoped to their own project site — the roster
// lookup underneath is already project-scoped for non-Admin/HR actors, so no
// extra filtering is needed here. Manager and plain Employee only ever have
// a single record worth looking at — their own — so they're sent straight to
// it instead of a list they can't meaningfully search.
export default async function AttendancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) redirect("/login");
  if (session.user.role === "Manager") redirect("/employees/attendance/my");
  if (session.user.role === "Employee") {
    await connectMongoDB();
    const actor = await buildAttendanceActor(
      { employeeRepository, settingRepository },
      session.user,
      crypto.randomUUID(),
    );
    if (!actor.hasAttendanceSelfService) redirect("/employees/attendance/my");
  }
  return <AttendanceModule />;
}
