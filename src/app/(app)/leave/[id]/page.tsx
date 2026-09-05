import { notFound } from "next/navigation";
import { connectMongoDB } from "@/lib/mongodb";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { getEmployee } from "@/services/employee-service";
import { LeaveDetail } from "@/features/leave/components/leave-detail";

type RouteParams = { params: Promise<{ id: string }> };

export default async function LeaveEmployeePage({ params }: RouteParams) {
  const { id } = await params;
  await connectMongoDB();
  const employee = await getEmployee(new MongoEmployeeRepository(), id);
  if (!employee) notFound();
  return <LeaveDetail employee={employee} />;
}
