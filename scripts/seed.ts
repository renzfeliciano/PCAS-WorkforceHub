import mongoose from "mongoose";
import { config } from "dotenv";
import { connectMongoDB } from "@/lib/mongodb";
import { seedSettingsCatalog } from "@/services/settings-seed-service";
import { getEnabledSeedKinds } from "@/lib/seed-flags";

config({ path: ".env.local", override: true });
config({ path: ".env" });

async function seed() {
  await connectMongoDB();
  const kinds = getEnabledSeedKinds();
  const result = await seedSettingsCatalog(kinds);
  console.log(`Seed complete: ${result.upsertedCount} catalog entries inserted.`);
  await mongoose.connection.close();
}

seed().catch((error: unknown) => {
  console.error("Seed failed", error);
  process.exitCode = 1;
});
