import { Pencil } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Spinner } from "@/components/ui/spinner";
import type { AppUser } from "@/types/user";
import type { SortDir } from "@/types/list-query";

type UsersTableProps = Readonly<{
  users: AppUser[];
  currentUserId: string;
  activatingId?: string | null;
  sortBy?: string;
  sortDir?: SortDir;
  onSort: (field: string) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onEdit: (user: AppUser) => void;
  onActivate: (user: AppUser) => void;
  onDeactivate: (user: AppUser) => void;
}>;

export function UsersTable({
  users,
  currentUserId,
  activatingId,
  sortBy,
  sortDir,
  onSort,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onActivate,
  onDeactivate,
}: UsersTableProps) {
  return (
    <div className="table-card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortableHeader
                field="name"
                label="Name"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
              <SortableHeader
                field="position"
                label="Position"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
              <SortableHeader
                field="projectSite"
                label="Project"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
              <SortableHeader
                field="username"
                label="Username"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
              <SortableHeader
                field="role"
                label="Role"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
              <SortableHeader
                field="active"
                label="Status"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} data-testid={`user-row-${user.id}`}>
                <td>{user.name}</td>
                <td>{user.position ?? "—"}</td>
                <td>{user.projectSite ?? "—"}</td>
                <td>{user.username}</td>
                <td>{user.role}</td>
                <td>
                  <span className={user.active ? "allowed" : "blocked"}>
                    {user.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="edit"
                      onClick={() => onEdit(user)}
                      aria-label={`Edit ${user.name}`}
                      title="Edit"
                      data-testid={`edit-user-${user.id}`}
                    >
                      <Pencil size={14} />
                    </button>
                    {user.id !== currentUserId &&
                      (user.active ? (
                        <button
                          type="button"
                          className="deactivate-setting"
                          onClick={() => onDeactivate(user)}
                          aria-label={`Deactivate ${user.name}`}
                          data-testid={`deactivate-user-${user.id}`}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="edit-setting"
                          onClick={() => onActivate(user)}
                          disabled={activatingId === user.id}
                          aria-label={`Activate ${user.name}`}
                          data-testid={`activate-user-${user.id}`}
                        >
                          {activatingId === user.id ? <Spinner size={11} /> : "Activate"}
                        </button>
                      ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        itemLabel="user"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
