import { connectMongoDB } from "@/lib/mongodb";
import { withRoleGuard } from "@/lib/with-role-guard";
import { MongoCaseRecordRepository } from "@/repositories/case-record-repository";
import { listCaseRecords } from "@/services/case-record-service";
import { CaseMonitoringModule } from "@/features/case-monitoring/case-monitoring-module";

export default async function CaseMonitoringPage() {
  await withRoleGuard(["Admin", "HR"]);
  await connectMongoDB();
  const initialData = await listCaseRecords(new MongoCaseRecordRepository(), { page: 1, pageSize: 20 });
  return <CaseMonitoringModule initialData={initialData} />;
}
