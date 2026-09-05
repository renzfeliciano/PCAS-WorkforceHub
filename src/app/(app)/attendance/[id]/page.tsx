import { notFound } from "next/navigation";
import { connectMongoDB } from "@/lib/mongodb";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { getEmployee } from "@/services/employee-service";
import { AttendanceCalendar } from "@/features/attendance/components/attendance-calendar";

type RouteParams = { params: Promise<{ id: string }> };

export default async function AttendanceEmployeePage({ params }: RouteParams) {
  const { id } = await params;
  await connectMongoDB();
  const employee = await getEmployee(new MongoEmployeeRepository(), id);
  if (!employee) notFound();
  return <AttendanceCalendar employee={employee} />;
}
