import { model, models, Schema } from "mongoose";

const travelOrderSchema = new Schema(
  {
    employees: {
      type: [
        {
          employeeId: { type: Schema.Types.ObjectId, required: true, ref: "Employee" },
          employeeNumber: { type: String, required: true },
          name: { type: String, required: true },
        },
      ],
      required: true,
      validate: {
        validator: (value: unknown[]) => value.length > 0,
        message: "At least one employee is required",
      },
    },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    remarks: { type: String, trim: true },
  },
  { timestamps: true },
);

travelOrderSchema.index({ startDate: -1 });

export const TravelOrderModel =
  models.TravelOrder ?? model("TravelOrder", travelOrderSchema);
