import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { connectMongoDB } from "@/lib/mongodb";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { MongoEventRepository } from "@/repositories/event-repository";
import { MongoJobApplicationRepository } from "@/repositories/job-application-repository";
import { getDashboardSummary } from "@/services/dashboard-service";
import { DashboardModule } from "@/features/dashboard/dashboard-module";

// "/" is the default landing spot after login, so Manager/Employee land on
// their own actual home page (the roster) instead of an "Access Denied"
// screen greeting them the moment they sign in.
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "Admin" && session?.user?.role !== "HR") {
    redirect("/employees/roster");
  }

  await connectMongoDB();
  const summary = await getDashboardSummary({
    employeeRepository: new MongoEmployeeRepository(),
    eventRepository: new MongoEventRepository(),
    jobApplicationRepository: new MongoJobApplicationRepository(),
  });
  return <DashboardModule initialData={summary} />;
}
