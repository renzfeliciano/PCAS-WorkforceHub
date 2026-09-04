import { connectMongoDB } from "@/lib/mongodb";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { getDashboardSummary } from "@/services/dashboard-service";
import { DashboardModule } from "@/features/dashboard/dashboard-module";

export default async function DashboardPage() {
  await connectMongoDB();
  const summary = await getDashboardSummary(new MongoEmployeeRepository());
  return <DashboardModule initialData={summary} />;
}
