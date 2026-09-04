"use client";

import { useCallback, useEffect, useState } from "react";
import { employeesClient } from "@/features/employees/api/employees-client";
import type { EmployeeListParams } from "@/features/employees/api/employees-client";
import type { EmployeeInput, EmployeeUpdateInput } from "@/schemas/employee";
import type { Employee, LeaveBalance } from "@/types/employee";

export function useEmployees({
  page,
  pageSize,
  query,
  status,
  includeArchived,
}: EmployeeListParams) {
  const [items, setItems] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await employeesClient.list({
        page,
        pageSize,
        query,
        status,
        includeArchived,
      });
      setItems(result.items);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, query, status, includeArchived]);

  useEffect(() => {
    let cancelled = false;
    employeesClient
      .list({ page, pageSize, query, status, includeArchived })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load employees");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, query, status, includeArchived]);

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
  const updateLeaveBalances = useCallback(
    async (id: string, balances: LeaveBalance[]) => {
      const employee = await employeesClient.updateLeaveBalances(id, balances);
      await load();
      return employee;
    },
    [load],
  );

  return {
    items,
    total,
    isLoading,
    error,
    reload: load,
    create,
    update,
    archive,
    restore,
    updateLeaveBalances,
  };
}
