"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Plus, Printer, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/context/current-user-context";
import { useCatalogOptions } from "@/hooks/use-catalog-options";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSortState } from "@/hooks/use-sort-state";
import { canExportData, canManageCaseMonitoring } from "@/lib/rbac";
import {
  caseRecordsClient,
  type CaseRecordListResponse,
} from "@/features/case-monitoring/api/case-records-client";
import { CaseFilters, type CaseFiltersValue } from "@/features/case-monitoring/components/case-filters";
import { CaseRecordTable } from "@/features/case-monitoring/components/case-record-table";
import { CaseRecordFormDialog } from "@/features/case-monitoring/components/case-record-form-dialog";
import { CaseRecordPrintReport } from "@/features/case-monitoring/components/case-record-print-report";
import { exportCaseRecordsCsv } from "@/features/case-monitoring/utils/export-csv";
import { CASE_CLASSIFICATION_CATEGORY, CASE_STATUS_CATEGORY } from "@/types/catalog";
import type { CaseRecord } from "@/types/case-record";

const DEFAULT_PAGE_SIZE = 10;
const BULK_FETCH_PAGE_SIZE = 100;
const EMPTY_FILTERS: CaseFiltersValue = { projectId: "", classificationId: "", statusId: "" };

export function CaseMonitoringModule({
  initialData,
}: Readonly<{ initialData?: CaseRecordListResponse }>) {
  const user = useCurrentUser();
  const canManage = canManageCaseMonitoring(user.role);
  const canExport = canExportData(user.role);

  const { activeItems: projects } = useCatalogOptions("project");
  const { activeItems: classifications } = useCatalogOptions("status", CASE_CLASSIFICATION_CATEGORY);
  const { activeItems: statuses } = useCatalogOptions("status", CASE_STATUS_CATEGORY);

  const [filters, setFilters] = useState<CaseFiltersValue>(EMPTY_FILTERS);
  const [rawQuery, setRawQuery] = useState("");
  const debouncedQuery = useDebouncedValue(rawQuery, 300);
  const { sortBy, sortDir, toggleSort } = useSortState();
  const [items, setItems] = useState<CaseRecord[]>(initialData?.items ?? []);
  const [total, setTotal] = useState(initialData?.total ?? 0);
  const [page, setPage] = useState(initialData?.page ?? 1);
  const [pageSize, setPageSize] = useState(initialData?.pageSize ?? DEFAULT_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<CaseRecord | "new" | null>(null);
  const [deleting, setDeleting] = useState<CaseRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState<{ records: CaseRecord[]; generatedAt: Date } | null>(null);

  async function reload(
    nextPage = page,
    nextPageSize = pageSize,
    nextFilters = filters,
    nextQuery = debouncedQuery,
    nextSortBy = sortBy,
    nextSortDir = sortDir,
  ) {
    setIsLoading(true);
    try {
      const result = await caseRecordsClient.list({
        page: nextPage,
        pageSize: nextPageSize,
        query: nextQuery || undefined,
        projectId: nextFilters.projectId || undefined,
        classificationId: nextFilters.classificationId || undefined,
        statusId: nextFilters.statusId || undefined,
        sortBy: nextSortBy,
        sortDir: nextSortDir,
      });
      setItems(result.items);
      setTotal(result.total);
      setPage(result.page);
      setPageSize(result.pageSize);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load case records.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (initialData) return;
    queueMicrotask(() => reload());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search and sort both reset back to page 1, same as a filter change — the
  // very first run is skipped since the mount effect above already covers
  // the initial load.
  const skippedFirstRun = useRef(false);
  useEffect(() => {
    if (!skippedFirstRun.current) {
      skippedFirstRun.current = true;
      return;
    }
    reload(1, pageSize, filters, debouncedQuery, sortBy, sortDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, sortBy, sortDir]);

  function handleFiltersChange(next: CaseFiltersValue) {
    setFilters(next);
    reload(1, pageSize, next);
  }

  /** Every record matching the current search/filters, fetched page by page — used by both CSV export and Print so neither is limited to the one visible page. */
  async function fetchAllMatching(): Promise<CaseRecord[]> {
    const listParams = {
      query: debouncedQuery || undefined,
      projectId: filters.projectId || undefined,
      classificationId: filters.classificationId || undefined,
      statusId: filters.statusId || undefined,
      sortBy,
      sortDir,
    };
    const first = await caseRecordsClient.list({ ...listParams, page: 1, pageSize: BULK_FETCH_PAGE_SIZE });
    const all = [...first.items];
    const totalPages = Math.ceil(first.total / BULK_FETCH_PAGE_SIZE);
    for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
      const next = await caseRecordsClient.list({ ...listParams, page: currentPage, pageSize: BULK_FETCH_PAGE_SIZE });
      all.push(...next.items);
    }
    return all;
  }

  async function handleExportCsv() {
    setIsExporting(true);
    try {
      exportCaseRecordsCsv(await fetchAllMatching());
    } finally {
      setIsExporting(false);
    }
  }

  async function handlePrint() {
    setIsPrinting(true);
    try {
      const records = await fetchAllMatching();
      setPrintData({ records, generatedAt: new Date() });
      // Let the print report actually render before invoking the browser's
      // print dialog — window.print() is synchronous and blocks until the
      // dialog closes, so this has to happen on the next tick.
      requestAnimationFrame(() => {
        window.print();
        setPrintData(null);
      });
    } finally {
      setIsPrinting(false);
    }
  }

  const filterSummary = {
    query: debouncedQuery || undefined,
    project: projects.find((item) => item.id === filters.projectId)?.name,
    classification: classifications.find((item) => item.id === filters.classificationId)?.name,
    status: statuses.find((item) => item.id === filters.statusId)?.name,
  };

  return (
    <>
      <div className="no-print">
        <div className="page-head">
          <div>
            <p className="eyebrow">Legal & Compliance</p>
            <h1>Case monitoring</h1>
            <p className="muted">
              Track SeNA/labor, criminal, civil, and regulatory cases against the company.
            </p>
          </div>
          <div className="actions">
            {canExport && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleExportCsv}
                isLoading={isExporting}
                loadingText="Exporting CSV"
                disabled={total === 0}
              >
                <Download size={14} /> Export CSV
              </Button>
            )}
            {canExport && (
              <Button
                type="button"
                variant="secondary"
                onClick={handlePrint}
                isLoading={isPrinting}
                loadingText="Preparing print"
                disabled={total === 0}
              >
                <Printer size={14} /> Print
              </Button>
            )}
            {canManage && (
              <Button
                type="button"
                variant="primary"
                onClick={() => setEditing("new")}
                data-testid="add-case-record"
              >
                <Plus size={14} /> Add case
              </Button>
            )}
          </div>
        </div>
        <CaseFilters
          query={rawQuery}
          onQueryChange={setRawQuery}
          value={filters}
          onChange={handleFiltersChange}
          isFetching={isLoading}
        />
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
            icon={<Scale size={40} />}
            title="No cases found"
            description="Try different filters, or add a case to start tracking it."
          />
        ) : (
          <CaseRecordTable
            records={items}
            startIndex={(page - 1) * pageSize}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={toggleSort}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(nextPage) => reload(nextPage, pageSize)}
            onPageSizeChange={(nextPageSize) => reload(1, nextPageSize)}
            canManage={canManage}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
        )}
        {editing && (
          <CaseRecordFormDialog
            mode={editing === "new" ? "create" : "edit"}
            initialValue={editing === "new" ? undefined : editing}
            onClose={() => setEditing(null)}
            onSubmit={async (input) => {
              if (editing === "new") {
                await caseRecordsClient.create(input);
              } else {
                await caseRecordsClient.update(editing.id, input);
              }
              setEditing(null);
              await reload();
            }}
          />
        )}
        {deleting && (
          <ConfirmDialog
            eyebrow="Remove case"
            title={`Delete ${deleting.caseName}?`}
            description="This permanently removes the case record and cannot be undone."
            confirmLabel="Delete"
            confirmLoadingLabel="Deleting"
            onClose={() => setDeleting(null)}
            onConfirm={async () => {
              await caseRecordsClient.delete(deleting.id);
              setDeleting(null);
              await reload();
            }}
          />
        )}
      </div>
      {printData && (
        <CaseRecordPrintReport
          records={printData.records}
          filters={filterSummary}
          generatedAt={printData.generatedAt}
        />
      )}
    </>
  );
}
