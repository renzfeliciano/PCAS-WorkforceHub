import { isValidObjectId } from "mongoose";
import { SettingModel } from "@/repositories/models/setting-model";

type CatalogNameDocument = { _id: { toString(): string }; name: string };

/**
 * Batch-resolves Setting._id strings to their current `name` in one query,
 * so a catalog entry's rename is reflected everywhere it's referenced
 * without touching the documents that reference it. An id that doesn't
 * resolve (deleted catalog entry, bad data) is simply absent from the map —
 * callers decide the fallback display value.
 */
export async function resolveCatalogNames(ids: readonly string[]): Promise<Map<string, string>> {
  const uniqueValidIds = [...new Set(ids)].filter((id) => isValidObjectId(id));
  if (!uniqueValidIds.length) return new Map();
  const docs = await SettingModel.find({ _id: { $in: uniqueValidIds } })
    .select({ name: 1 })
    .lean<CatalogNameDocument[]>();
  return new Map(docs.map((doc) => [doc._id.toString(), doc.name]));
}

/** Single-id convenience wrapper around resolveCatalogNames for one-off lookups. */
export async function resolveCatalogName(id: string): Promise<string> {
  const names = await resolveCatalogNames([id]);
  return names.get(id) ?? "";
}

/**
 * `$lookup` pipeline stage that resolves a `Setting._id` string field on the
 * pipeline's current documents to that setting's current `name`, tolerating
 * ids that aren't valid ObjectIds (via `$convert`'s onError/onNull) so a bad
 * or orphaned reference doesn't fail the whole aggregation.
 */
export function lookupCatalogNameStage(idField: string, as: string) {
  return {
    $lookup: {
      from: SettingModel.collection.name,
      let: { catalogId: `$${idField}` },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: [
                "$_id",
                { $convert: { input: "$$catalogId", to: "objectId", onError: null, onNull: null } },
              ],
            },
          },
        },
        { $project: { _id: 0, name: 1 } },
      ],
      as,
    },
  };
}
