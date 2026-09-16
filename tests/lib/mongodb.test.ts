import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import "@/repositories/models"; // ensures every model is registered for the index checks below

describe("connectMongoDB — index readiness", () => {
  it("has every registered model's indexes actually built on the server by the time it resolves", async () => {
    await connectMongoDB();
    const db = mongoose.connection.db;
    expect(db).toBeDefined();

    // A representative sample of the unique indexes this app depends on for
    // correctness (duplicate-key rejection) — if connectMongoDB() didn't
    // wait for index builds, one of these could still be missing here.
    const checks: [collection: string, indexName: string][] = [
      ["employees", "employeeNumber_1"],
      ["users", "username_1"],
      ["catalogs", "kind_1_category_1_name_1"],
      ["attendancerecords", "employeeId_1_date_1"],
      ["leavetypes", "code_1"],
    ];

    for (const [collectionName, indexName] of checks) {
      const exists = await db!.collection(collectionName).indexExists(indexName);
      expect(exists, `expected index "${indexName}" on "${collectionName}" to exist`).toBe(true);
    }
  });
});
