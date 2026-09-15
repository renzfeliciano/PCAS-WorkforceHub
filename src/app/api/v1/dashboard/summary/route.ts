import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { MongoEventRepository } from "@/repositories/event-repository";
import { MongoJobApplicationRepository } from "@/repositories/job-application-repository";
import { MongoCaseRecordRepository } from "@/repositories/case-record-repository";
import { getDashboardSummary } from "@/services/dashboard-service";

const employeeRepository = new MongoEmployeeRepository();
const eventRepository = new MongoEventRepository();
const jobApplicationRepository = new MongoJobApplicationRepository();
const caseRecordRepository = new MongoCaseRecordRepository();

export async function GET(request: Request) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { requestId, headers } = guard;
  try {
    await connectMongoDB();
    const summary = await getDashboardSummary({
      employeeRepository,
      eventRepository,
      jobApplicationRepository,
      caseRecordRepository,
    });
    return apiJson(summary, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
