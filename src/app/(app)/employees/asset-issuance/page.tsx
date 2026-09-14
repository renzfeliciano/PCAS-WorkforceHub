import { withRoleGuard } from "@/lib/with-role-guard";
import { AssetIssuanceModule } from "@/features/asset-issuance/asset-issuance-module";

export default async function AssetIssuancePage() {
  await withRoleGuard(["Admin", "HR"]);
  return <AssetIssuanceModule />;
}
