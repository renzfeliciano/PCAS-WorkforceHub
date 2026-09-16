import { Pencil, Trash2 } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { SortableHeader } from "@/components/ui/sortable-header";
import type { CaseRecord } from "@/types/case-record";
import type { SortDir } from "@/types/list-query";

type CaseRecordTableProps = Readonly<{
  records: CaseRecord[];
  startIndex: number;
  sortBy?: string;
  sortDir?: SortDir;
  onSort: (field: string) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  canManage: boolean;
  onEdit: (record: CaseRecord) => void;
  onDelete: (record: CaseRecord) => void;
}>;

export function CaseRecordTable({
  records,
  startIndex,
  sortBy,
  sortDir,
  onSort,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  canManage,
  onEdit,
  onDelete,
}: CaseRecordTableProps) {
  return (
    <div className="table-card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="col-index">#</th>
              <SortableHeader field="project" label="Project" activeField={sortBy} direction={sortDir} onSort={onSort} />
              <SortableHeader field="caseName" label="Case name" activeField={sortBy} direction={sortDir} onSort={onSort} />
              <SortableHeader field="caseNumber" label="Case number" activeField={sortBy} direction={sortDir} onSort={onSort} />
              <SortableHeader
                field="classification"
                label="Classification"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
              <SortableHeader field="status" label="Status" activeField={sortBy} direction={sortDir} onSort={onSort} />
              <SortableHeader
                field="legalCounsel"
                label="Legal counsel"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
              {canManage && <th />}
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={record.id} data-testid={`case-record-row-${record.id}`}>
                <td className="col-index">{startIndex + index + 1}</td>
                <td>{record.project}</td>
                <td>{record.caseName}</td>
                <td>{record.caseNumber}</td>
                <td>{record.classification}</td>
                <td>{record.status}</td>
                <td>{record.legalCounsel || "—"}</td>
                {canManage && (
                  <td>
                    <div className="row-actions">
                      <button
                        className="edit"
                        type="button"
                        onClick={() => onEdit(record)}
                        aria-label={`Edit ${record.caseName}`}
                        title="Edit"
                        data-testid={`edit-case-record-${record.id}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="delete-setting"
                        type="button"
                        onClick={() => onDelete(record)}
                        aria-label={`Delete ${record.caseName}`}
                        title="Delete"
                        data-testid={`delete-case-record-${record.id}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        itemLabel="case"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
