"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/context/current-user-context";
import { canManageTravelOrders } from "@/lib/rbac";
import { travelOrdersClient } from "@/features/travel-orders/api/travel-orders-client";
import { TravelOrderFormDialog } from "@/features/travel-orders/components/travel-order-form-dialog";
import type { TravelOrder } from "@/types/travel-order";

export function TravelOrdersModule({
  initialItems,
}: Readonly<{ initialItems?: TravelOrder[] }>) {
  const user = useCurrentUser();
  const canManage = canManageTravelOrders(user.role);

  const [items, setItems] = useState<TravelOrder[]>(initialItems ?? []);
  const [isLoading, setIsLoading] = useState(!initialItems);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<TravelOrder | "new" | null>(null);
  const [deleting, setDeleting] = useState<TravelOrder | null>(null);

  async function reload() {
    try {
      const result = await travelOrdersClient.list();
      setItems(result.items);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load travel orders.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (initialItems) return;
    queueMicrotask(reload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Travel Orders Logging</p>
          <h1>Travel orders</h1>
          <p className="muted">
            Dispatch one or more employees for a date range.
          </p>
        </div>
        {canManage && (
          <div className="actions">
            <Button
              type="button"
              variant="primary"
              onClick={() => setEditing("new")}
              data-testid="add-travel-order"
            >
              <Plus size={14} /> New travel order
            </Button>
          </div>
        )}
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {isLoading ? (
        <div className="loading-pad">
          <Spinner size={16} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No travel orders yet"
          description="Create one to dispatch employees for a date range."
        />
      ) : (
        <ul className="setting-list">
          {items.map((order) => {
            const employeeNames = order.employees.map((employee) => employee.name).join("; ");
            const summary =
              order.employees.length > 3
                ? `${order.employees
                    .slice(0, 3)
                    .map((employee) => employee.name)
                    .join("; ")} and others...`
                : employeeNames;
            const rowLabel = `${employeeNames}, ${order.startDate} to ${order.endDate}`;
            return (
              <li
                className="setting-row travel-order-row"
                key={order.id}
                data-testid={`travel-order-row-${order.id}`}
              >
                <span className="setting-dot" />
                <div>
                  <b>{summary}</b>
                  <small>
                    {order.startDate} to {order.endDate}
                    {order.remarks ? ` · ${order.remarks}` : ""}
                  </small>
                </div>
                {canManage && (
                  <>
                    <button
                      type="button"
                      className="edit-setting"
                      onClick={() => setEditing(order)}
                      aria-label={`Edit travel order for ${rowLabel}`}
                      title="Edit"
                      data-testid={`edit-travel-order-${order.id}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="delete-setting"
                      onClick={() => setDeleting(order)}
                      aria-label={`Delete travel order for ${rowLabel}`}
                      title="Delete"
                      data-testid={`delete-travel-order-${order.id}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {editing && (
        <TravelOrderFormDialog
          mode={editing === "new" ? "create" : "edit"}
          initialValue={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            if (editing === "new") {
              await travelOrdersClient.create(input);
            } else {
              await travelOrdersClient.update(editing.id, input);
            }
            setEditing(null);
            await reload();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          eyebrow="Remove travel order"
          title="Delete this travel order?"
          description="This cannot be undone."
          confirmLabel="Delete"
          confirmLoadingLabel="Deleting"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await travelOrdersClient.delete(deleting.id);
            setDeleting(null);
            await reload();
          }}
        />
      )}
    </>
  );
}
