import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const ASSET_CONDITIONS = ["Good", "Fair", "Damaged", "Lost"] as const;
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];

export const assetIssuanceSchema = z
  .object({
    assetName: z.string().trim().min(1, "Asset name is required").max(120),
    assetType: z.string().trim().max(60).optional(),
    serialNumber: z.string().trim().max(80).optional(),
    condition: z.enum(ASSET_CONDITIONS),
    issuedDate: isoDate,
    returnedDate: isoDate.optional(),
    remarks: z.string().trim().max(255).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.returnedDate && data.returnedDate < data.issuedDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["returnedDate"],
        message: "Return date must be on or after the issued date.",
      });
    }
  });

export const createAssetIssuanceSchema = assetIssuanceSchema;
export const updateAssetIssuanceSchema = assetIssuanceSchema;
export type AssetIssuanceInput = z.infer<typeof assetIssuanceSchema>;
