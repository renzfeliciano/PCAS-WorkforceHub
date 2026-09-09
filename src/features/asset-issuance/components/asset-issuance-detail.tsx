"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/context/current-user-context";
import { canManageAssetIssuance } from "@/lib/rbac";
import { assetIssuanceClient } from "@/features/asset-issuance/api/asset-issuance-client";
import { AssetIssuanceFormDialog } from "@/features/asset-issuance/components/asset-issuance-form-dialog";
import type { Employee } from "@/types/employee";
import type { AssetIssuance } from "@/types/asset-issuance";

export function AssetIssuanceDetail({ employee }: Readonly<{ employee: Employee }>) {
  const user = useCurrentUser();
  const canManage = canManageAssetIssuance(user.role);

  const [records, setRecords] = useState<AssetIssuance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<AssetIssuance | "new" | null>(null);
  const [deleting, setDeleting] = useState<AssetIssuance | null>(null);

  async function reload() {
    try {
      const result = await assetIssuanceClient.list(employee.id);
      setRecords(result.items);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load asset issuance records.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    assetIssuanceClient
      .list(employee.id)
      .then((result) => {
        if (cancelled) return;
        setRecords(result.items);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load asset issuance records.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employee.id]);

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/employees/asset-issuance" className="back-link">
            <ArrowLeft size={14} /> Asset issuance
          </Link>
          <h1>{employee.name}</h1>
          <p className="muted">
            {[employee.employeeNumber, employee.position].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>Issued assets</h2>
            <p className="muted">Company assets currently or previously issued to this employee.</p>
          </div>
          {canManage && (
            <Button type="button" variant="primary" onClick={() => setEditing("new")} data-testid="add-asset-issuance">
              <Package size={14} /> Log issuance
            </Button>
          )}
        </div>
        {isLoading ? (
          <div className="loading-pad">
            <Spinner size={16} />
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            title="No assets logged yet"
            description="Log an asset to start tracking what this employee has."
          />
        ) : (
          <ul className="setting-list">
            {records.map((record) => {
              const isReturned = Boolean(record.returnedDate);
              return (
                <li className="setting-row" key={record.id} data-testid={`asset-issuance-row-${record.id}`}>
                  <span className="setting-dot" />
                  <div>
                    <b>{record.assetName}</b>
                    <small>
                      Issued {record.issuedDate}
                      {isReturned ? ` · Returned ${record.returnedDate}` : ""} · {record.condition}
                      {record.remarks ? ` · ${record.remarks}` : ""}
                    </small>
                  </div>
                  <span className={`setting-state ${isReturned ? "disabled" : "enabled"}`}>
                    {isReturned ? "Returned" : "Issued"}
                  </span>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        className="edit-setting"
                        onClick={() => setEditing(record)}
                        aria-label={`Edit ${record.assetName} issuance`}
                        title="Edit"
                        data-testid={`edit-asset-issuance-${record.id}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="delete-setting"
                        onClick={() => setDeleting(record)}
                        aria-label={`Delete ${record.assetName} issuance`}
                        title="Delete"
                        data-testid={`delete-asset-issuance-${record.id}`}
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
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </section>

      {editing && (
        <AssetIssuanceFormDialog
          mode={editing === "new" ? "create" : "edit"}
          employeeName={employee.name}
          initialValue={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            if (editing === "new") {
              await assetIssuanceClient.create(employee.id, input);
            } else {
              await assetIssuanceClient.update(employee.id, editing.id, input);
            }
            setEditing(null);
            await reload();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          eyebrow="Remove asset issuance"
          title={`Delete this ${deleting.assetName} record?`}
          description="This cannot be undone."
          confirmLabel="Delete"
          confirmLoadingLabel="Deleting"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await assetIssuanceClient.delete(employee.id, deleting.id);
            setDeleting(null);
            await reload();
          }}
        />
      )}
    </>
  );
}
