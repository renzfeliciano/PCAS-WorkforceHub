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
