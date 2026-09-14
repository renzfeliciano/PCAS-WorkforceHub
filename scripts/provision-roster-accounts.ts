/**
 * One-off (but safely re-runnable) backfill: provisions a login account for
 * every non-archived roster employee that doesn't already have one linked.
 * Username is derived from the employee's name (see @/lib/username), the
 * account's role comes from Employee.userRole, and the password is the
 * shared default (@/services/user-service's DEFAULT_PROVISIONED_PASSWORD),
 * with mustChangePassword forcing a change on first login.
 *
 * Idempotent — skips any employee that already has a linked account, so it's
 * safe to re-run after fixing a name that failed to parse the first time.
 *
 *   npx tsx scripts/provision-roster-accounts.ts
 */
import mongoose from "mongoose";
import { config } from "dotenv";
import { connectMongoDB } from "@/lib/mongodb";
import { auditLogger } from "@/lib/audit-logger";
import { UnparseableNameError } from "@/lib/username";
import { EmployeeModel } from "@/repositories/models/employee-model";
import { MongoUserRepository } from "@/repositories/user-repository";
import { provisionEmployeeAccount } from "@/services/user-service";
import type { EmployeeUserRole } from "@/types/employee";
import type { Role } from "@/types/user";

config({ path: ".env.local", override: true });
config({ path: ".env" });

const SYSTEM_ACTOR = { role: "Admin" as Role, id: "system:provision-roster-accounts", requestId: crypto.randomUUID() };

async function main() {
  await connectMongoDB();
  try {
    await run();
  } finally {
    // Must run even on failure — an open Mongoose connection has an active
    // keepalive, so without this the process hangs indefinitely instead of
    // exiting after an error (this is exactly what happened the first time:
    // a legacy employee document with no userRole field on disk threw a
    // Mongoose validation error, and the process never came back).
    await mongoose.connection.close();
  }
}

async function run() {
  const userRepository = new MongoUserRepository();
  const existingUsernames = new Set(await userRepository.listAllUsernames());
  const linkedEmployeeIds = new Set(
    (await userRepository.findAll({ page: 1, pageSize: 100_000 })).items
      .map((u) => u.employeeId)
      .filter((id): id is string => Boolean(id)),
  );

  // .lean() never applies the schema's field default, so a document saved
  // before userRole existed has no such field on disk — same gap the
  // repository's toEmployee() defaults for the read path, needed here too
  // since this queries EmployeeModel directly.
  const employees = (
    await EmployeeModel.find({ archived: false }).lean<
      { _id: mongoose.Types.ObjectId; name: string; userRole?: EmployeeUserRole }[]
    >()
  ).map((doc) => ({ ...doc, userRole: doc.userRole ?? ("Employee" as const) }));

  let provisioned = 0;
  let alreadyLinked = 0;
  const skipped: { id: string; name: string; reason: string }[] = [];

  for (const doc of employees) {
    const id = doc._id.toString();
    if (linkedEmployeeIds.has(id)) {
      alreadyLinked += 1;
      continue;
    }
    try {
      const user = await provisionEmployeeAccount(
        userRepository,
        auditLogger,
        SYSTEM_ACTOR,
        { id, name: doc.name, userRole: doc.userRole },
        existingUsernames,
      );
      provisioned += 1;
      console.log(`Provisioned ${user.username} (${doc.name}, ${user.role}) for employee ${id}.`);
    } catch (error) {
      if (error instanceof UnparseableNameError) {
        skipped.push({ id, name: doc.name, reason: error.message });
        continue;
      }
      throw error;
    }
  }

  console.log(
    `\nDone. Provisioned ${provisioned}, already linked ${alreadyLinked}, skipped ${skipped.length}.`,
  );
  if (skipped.length > 0) {
    console.log("\nSkipped (fix the name to \"Last, First Middle\" and re-run this script):");
    for (const entry of skipped) console.log(`  - [${entry.id}] "${entry.name}": ${entry.reason}`);
  }
}

main().catch((error: unknown) => {
  console.error("Roster account provisioning failed", error);
  process.exitCode = 1;
});
