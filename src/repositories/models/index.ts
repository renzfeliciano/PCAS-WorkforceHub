/**
 * Every Mongoose model in the app, in one place, so connectMongoDB() can
 * guarantee all of them are registered and their indexes finished building
 * before a connection is handed back — see connectMongoDB()'s comment for
 * why this matters. Add new models here when they're created; nothing else
 * discovers them automatically.
 */
export { AssetIssuanceModel } from "@/repositories/models/asset-issuance-model";
export { AttendanceRecordModel } from "@/repositories/models/attendance-record-model";
export { AuditLogModel } from "@/repositories/models/audit-log-model";
export { EmployeeModel } from "@/repositories/models/employee-model";
export { EventModel } from "@/repositories/models/event-model";
export { JobApplicationModel } from "@/repositories/models/job-application-model";
export { LeaveBalanceChangeModel } from "@/repositories/models/leave-balance-change-model";
export { LeaveRecordModel } from "@/repositories/models/leave-record-model";
export { LeaveTypeModel } from "@/repositories/models/leave-type-model";
export { SettingModel } from "@/repositories/models/setting-model";
export { TravelOrderModel } from "@/repositories/models/travel-order-model";
export { UserModel } from "@/repositories/models/user-model";
