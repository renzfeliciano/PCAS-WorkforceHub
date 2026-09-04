import "dotenv/config";
import mongoose from "mongoose";
import { config } from "dotenv";
import { hash } from "bcryptjs";
import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/repositories/models/user-model";
import { seedSettingsCatalog } from "@/services/settings-seed-service";
import { getEnabledSeedKinds } from "@/lib/seed-flags";

config({ path: ".env.local", override: true });
config({ path: ".env" });

async function seed() {
  await connectMongoDB();
  const kinds = getEnabledSeedKinds();
  const result = await seedSettingsCatalog(kinds);
  let adminCreated = false;
  const adminUsername = process.env.DEMO_ADMIN_USERNAME?.trim().toLowerCase();
  const adminEmail = process.env.DEMO_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
  if (
    adminUsername &&
    adminPassword &&
    !adminPassword.startsWith("replace-with-")
  ) {
    const passwordHash = await hash(adminPassword, 12);
    const adminResult = await UserModel.updateOne(
      { username: adminUsername },
      {
        $setOnInsert: {
          username: adminUsername,
          ...(adminEmail ? { email: adminEmail } : {}),
          name: "Demo Super Admin",
          passwordHash,
          role: "Admin",
          active: true,
        },
      },
      { upsert: true },
    );
    adminCreated = adminResult.upsertedCount === 1;
  }
  console.log(
    `Seed complete: ${result.upsertedCount} catalog entries inserted; ${adminCreated ? "demo Admin created" : "existing Admin preserved or credentials not configured"}.`,
  );
  await mongoose.connection.close();
}

seed().catch((error: unknown) => {
  console.error("Seed failed", error);
  process.exitCode = 1;
});
