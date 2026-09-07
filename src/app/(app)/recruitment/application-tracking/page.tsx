import { connectMongoDB } from "@/lib/mongodb";
import { MongoJobApplicationRepository } from "@/repositories/job-application-repository";
import { listJobApplications } from "@/services/job-application-service";
import { RecruitmentModule } from "@/features/recruitment/recruitment-module";

export default async function ApplicationTrackingPage() {
  await connectMongoDB();
  const items = await listJobApplications(new MongoJobApplicationRepository());
  return <RecruitmentModule initialItems={items} />;
}
