"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { employeesClient } from "@/features/employees/api/employees-client";
import type { EmployeeListParams } from "@/features/employees/api/employees-client";
import { createRequestCache } from "@/lib/request-cache";
import type { EmployeeInput, EmployeeUpdateInput } from "@/schemas/employee";
import type { Employee } from "@/types/employee";

export type EmployeeListInitialData = { items: Employee[]; total: number };

/**
 * Standard for filtered/paginated tables: filter changes are debounced and the
 * previous in-flight request is aborted, so rapid clicks/typing collapse into
 * one request instead of hammering the API (and MongoDB Atlas behind it).
 * Results are cached briefly per exact filter combination so flipping between
 * recently-viewed filters doesn't refetch, and the cache is dropped on any
 * mutation so stale data never lingers after a create/update/archive.
 */
const FILTER_DEBOUNCE_MS = 300;
const CACHE_TTL_MS = 15_000;
const cache = createRequestCache<{ items: Employee[]; total: number }>(CACHE_TTL_MS);

function fetchEmployees(filters: EmployeeListParams, signal: AbortSignal) {
  return cache.get(JSON.stringify(filters), () => employeesClient.list(filters, signal));
}

export function useEmployees(
  { page, pageSize, query, status, projectId, includeArchived, sortBy, sortDir }: EmployeeListParams,
  initialData?: EmployeeListInitialData,
) {
  const [items, setItems] = useState<Employee[]>(initialData?.items ?? []);
  const [total, setTotal] = useState(initialData?.total ?? 0);
  const [isLoading, setIsLoading] = useState(initialData === undefined);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(initialData !== undefined);

  const load = useCallback(async () => {
    cache.clear();
    const controller = new AbortController();
    setIsFetching(true);
    try {
      const result = await employeesClient.list(
        { page, pageSize, query, status, projectId, includeArchived, sortBy, sortDir },
        controller.signal,
      );
      setItems(result.items);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees");
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [page, pageSize, query, status, projectId, includeArchived, sortBy, sortDir]);

  useEffect(() => {
    if (hydrated.current) {
      hydrated.current = false;
      return;
    }
    const controller = new AbortController();
    setIsFetching(true);
    const timeoutId = setTimeout(() => {
      fetchEmployees(
        { page, pageSize, query, status, projectId, includeArchived, sortBy, sortDir },
        controller.signal,
      )
        .then((result) => {
          setItems(result.items);
          setTotal(result.total);
          setError(null);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Failed to load employees");
        })
        .finally(() => {
          setIsLoading(false);
          setIsFetching(false);
        });
    }, FILTER_DEBOUNCE_MS);
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [page, pageSize, query, status, projectId, includeArchived, sortBy, sortDir]);

  const create = useCallback(
    async (input: EmployeeInput) => {
      const employee = await employeesClient.create(input);
      await load();
      return employee;
    },
    [load],
  );
  const update = useCallback(
    async (id: string, input: EmployeeUpdateInput) => {
      const employee = await employeesClient.update(id, input);
      await load();
      return employee;
    },
    [load],
  );
  const archive = useCallback(
    async (id: string) => {
      await employeesClient.archive(id);
      await load();
    },
    [load],
  );
  const restore = useCallback(
    async (id: string) => {
      await employeesClient.restore(id);
      await load();
    },
    [load],
  );
  const deletePermanently = useCallback(
    async (id: string) => {
      await employeesClient.deletePermanently(id);
      await load();
    },
    [load],
  );
  return {
    items,
    total,
    isLoading,
    isFetching,
    error,
    reload: load,
    create,
    update,
    archive,
    restore,
    deletePermanently,
  };
}
