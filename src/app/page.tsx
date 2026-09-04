import WorkforceHubShell from "@/components/workforce-hub-shell";
import { isSeedingEnabled } from "@/lib/seed-flags";

export default function Home() {
  return (
    <WorkforceHubShell
      seedFlags={{
        position: isSeedingEnabled("position"),
        project: isSeedingEnabled("project"),
        status: isSeedingEnabled("status"),
      }}
    />
  );
}
