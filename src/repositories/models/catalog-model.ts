import { model, models, Schema } from "mongoose";

const catalogSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: ["position", "project", "status"],
      required: true,
    },
    category: { type: String, trim: true },
    description: { type: String, trim: true },
    sortOrder: { type: Number },
    active: { type: Boolean, default: true, index: true },
    // Position entries only: grants the attendance self-service exception
    // (create/edit/delete their own record) to any employee holding this
    // position — tied to the entry's id, not its current name, so renaming
    // the position in Catalog Management never silently breaks the grant.
    // Any number of positions can carry this flag, not just one.
    grantsAttendanceSelfService: { type: Boolean, default: false },
    // Employment-status entries only (kind "status", category "employment"):
    // whether this status counts toward "active" headcount (e.g. the
    // dashboard's Total employees stat) — see Employee.employmentStatusId.
    // Defaults true so every status counts as active until an Admin/HR
    // explicitly opts one out (e.g. Terminated/Resigned/AWOL).
    countsAsActiveEmployment: { type: Boolean, default: true },
  },
  { timestamps: true },
);
catalogSchema.index({ kind: 1, category: 1, name: 1 }, { unique: true });
// Explicit collection name (rather than letting Mongoose derive "catalogs"
// from the model name on its own) so this stays correct and self-documenting
// even if the model is ever renamed again — see the "catalogs" collection
// this app writes to.
export const CatalogModel = models.Catalog ?? model("Catalog", catalogSchema, "catalogs");
