import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AttendanceModule } from "@/features/attendance/attendance-module";

// HR/Admin get the searchable list of every employee's attendance. Manager
// and Employee only ever have a single record worth looking at — their
// own — so they're sent straight to it instead of a list they can't
// meaningfully search (canViewAttendanceRecord would reject every other row).
export default async function AttendancePage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "Manager" || session?.user?.role === "Employee") {
    redirect("/employees/attendance/my");
  }
  return <AttendanceModule />;
}
