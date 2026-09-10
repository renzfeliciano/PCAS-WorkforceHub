import { connectMongoDB } from "@/lib/mongodb";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { MongoEventRepository } from "@/repositories/event-repository";
import { MongoJobApplicationRepository } from "@/repositories/job-application-repository";
import { getDashboardSummary } from "@/services/dashboard-service";
import { DashboardModule } from "@/features/dashboard/dashboard-module";

export default async function DashboardPage() {
  await connectMongoDB();
  const summary = await getDashboardSummary({
    employeeRepository: new MongoEmployeeRepository(),
    eventRepository: new MongoEventRepository(),
    jobApplicationRepository: new MongoJobApplicationRepository(),
  });
  return <DashboardModule initialData={summary} />;
}
