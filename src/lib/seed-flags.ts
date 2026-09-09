import type { SettingKind } from "@/types/settings";

const flagNames: Record<SettingKind, string> = {
  position: "ENABLE_POSITIONS_SEEDING",
  project: "ENABLE_PROJECTS_SEEDING",
  status: "ENABLE_STATUSES_SEEDING",
};

export function isSeedingEnabled(
  kind: SettingKind,
  env: NodeJS.ProcessEnv = process.env,
) {
  return env[flagNames[kind]] === "true";
}

export function getEnabledSeedKinds(env: NodeJS.ProcessEnv = process.env) {
  return (["position", "project", "status"] as const).filter((kind) =>
    isSeedingEnabled(kind, env),
  );
}

export function isDataResetEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.ENABLE_DATA_RESET === "true";
}

export function isLeaveTypeSeedingEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.ENABLE_LEAVE_TYPES_SEEDING === "true";
}

export function isAttendanceStatusSeedingEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.ENABLE_ATTENDANCE_STATUSES_SEEDING === "true";
}

export function isRecruitmentStageSeedingEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.ENABLE_RECRUITMENT_STAGES_SEEDING === "true";
}

export function isEventCategorySeedingEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.ENABLE_EVENTS_CATEGORY_SEEDING === "true";
}
