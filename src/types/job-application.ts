export type JobApplication = {
  id: string;
  applicantName: string;
  /** Setting._id (kind "position") this application currently references. */
  positionId: string;
  /** Current name of the referenced position catalog entry, resolved at read time. */
  position: string;
  email?: string;
  phone?: string;
  /** Setting._id (kind "status", category "recruitment") this application currently references. */
  stageId: string;
  /** Current name of the referenced stage catalog entry, resolved at read time. */
  stage: string;
  appliedDate: string;
  remarks?: string;
  createdAt: string;
};
