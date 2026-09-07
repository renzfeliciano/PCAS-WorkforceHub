import type { AssetCondition } from "@/schemas/asset-issuance";

export type AssetIssuance = {
  id: string;
  employeeId: string;
  assetName: string;
  assetType?: string;
  serialNumber?: string;
  condition: AssetCondition;
  issuedDate: string;
  returnedDate?: string;
  remarks?: string;
  createdAt: string;
};
