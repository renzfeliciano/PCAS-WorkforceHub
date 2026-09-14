import { notFound } from "next/navigation";
import { connectMongoDB } from "@/lib/mongodb";
import { withRoleGuard } from "@/lib/with-role-guard";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { getEmployee } from "@/services/employee-service";
import { AssetIssuanceDetail } from "@/features/asset-issuance/components/asset-issuance-detail";

type RouteParams = { params: Promise<{ id: string }> };

export default async function AssetIssuanceEmployeePage({ params }: RouteParams) {
  await withRoleGuard(["Admin", "HR"]);
  const { id } = await params;
  await connectMongoDB();
  const employee = await getEmployee(new MongoEmployeeRepository(), id);
  if (!employee) notFound();
  return <AssetIssuanceDetail employee={employee} />;
}
