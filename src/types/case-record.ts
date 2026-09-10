export type CaseRecord = {
  id: string;
  /** Setting._id (kind "project") this case currently references. */
  projectId: string;
  /** Current name of the referenced project catalog entry, resolved at read time. */
  project: string;
  caseName: string;
  caseNumber: string;
  /** Setting._id (kind "status", category "case-classification") this case currently references. */
  classificationId: string;
  /** Current name of the referenced classification catalog entry, resolved at read time. */
  classification: string;
  /** Setting._id (kind "status", category "case-status") this case currently references. */
  statusId: string;
  /** Current name of the referenced status catalog entry, resolved at read time. */
  status: string;
  briefHistory?: string;
  legalCounsel?: string;
  createdAt: string;
};
