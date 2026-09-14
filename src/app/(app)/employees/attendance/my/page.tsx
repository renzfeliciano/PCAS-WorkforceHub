import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { connectMongoDB } from "@/lib/mongodb";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { getEmployee } from "@/services/employee-service";
import { AttendanceCalendar } from "@/features/attendance/components/attendance-calendar";

export default async function MyAttendancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) redirect("/login");
  if (!session.user.employeeId) {
    return (
      <div className="page-head">
        <div>
          <h1>My Attendance</h1>
          <p className="muted">
            This account isn&apos;t linked to a roster record, so there&apos;s no attendance to
            show. Contact HR if you believe this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  await connectMongoDB();
  const employee = await getEmployee(new MongoEmployeeRepository(), session.user.employeeId);
  if (!employee) {
    return (
      <div className="page-head">
        <div>
          <h1>My Attendance</h1>
          <p className="muted">
            The roster record linked to this account could not be found. Contact HR if you believe
            this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  return <AttendanceCalendar employee={employee} />;
}
