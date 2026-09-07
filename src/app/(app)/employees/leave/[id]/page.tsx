import { redirect } from "next/navigation";

type RouteParams = { params: Promise<{ id: string }> };

export default async function LeaveEmployeeRedirectPage({ params }: RouteParams) {
  const { id } = await params;
  redirect(`/employees/leave-management/${id}`);
}
