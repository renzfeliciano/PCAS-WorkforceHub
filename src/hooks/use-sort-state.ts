import { useCallback, useState } from "react";
import type { SortDir } from "@/types/list-query";

/**
 * Generic sort state for any table: `field` is left untyped as `string` here
 * so this hook stays reusable across features, but each table should scope
 * calls to `toggleSort` to its own column-key union (e.g. `SortableEmployeeField`).
 */
export function useSortState(initial?: { sortBy?: string; sortDir?: SortDir }) {
  const [sortBy, setSortBy] = useState<string | undefined>(initial?.sortBy);
  const [sortDir, setSortDir] = useState<SortDir | undefined>(initial?.sortDir);

  const toggleSort = useCallback(
    (field: string) => {
      setSortBy((currentField) => {
        if (currentField !== field) {
          setSortDir("asc");
          return field;
        }
        setSortDir((currentDir) => (currentDir === "asc" ? "desc" : "asc"));
        return field;
      });
    },
    [],
  );

  return { sortBy, sortDir, toggleSort };
}
