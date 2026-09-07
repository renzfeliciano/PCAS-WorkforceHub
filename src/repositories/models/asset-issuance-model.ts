import { model, models, Schema } from "mongoose";
import { ASSET_CONDITIONS } from "@/schemas/asset-issuance";

const assetIssuanceSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, required: true, ref: "Employee", index: true },
    assetName: { type: String, required: true, trim: true },
    assetType: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    condition: { type: String, required: true, enum: ASSET_CONDITIONS },
    issuedDate: { type: String, required: true },
    returnedDate: { type: String },
    remarks: { type: String, trim: true },
  },
  { timestamps: true },
);

export const AssetIssuanceModel =
  models.AssetIssuance ?? model("AssetIssuance", assetIssuanceSchema);
