import { Pencil } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { AppUser } from "@/types/user";

type UsersTableProps = Readonly<{
  users: AppUser[];
  currentUserId: string;
  activatingId?: string | null;
  onEdit: (user: AppUser) => void;
  onActivate: (user: AppUser) => void;
  onDeactivate: (user: AppUser) => void;
}>;

export function UsersTable({
  users,
  currentUserId,
  activatingId,
  onEdit,
  onActivate,
  onDeactivate,
}: UsersTableProps) {
  return (
    <div className="permission-table">
      <div className="permission-row permission-header">
        <span>Name</span>
        <span>Username</span>
        <span>Role</span>
        <span>Status</span>
        <span>Actions</span>
      </div>
      {users.map((user) => (
        <div className="permission-row" key={user.id}>
          <span>{user.name}</span>
          <span>{user.username}</span>
          <span>{user.role}</span>
          <span className={user.active ? "allowed" : "blocked"}>
            {user.active ? "Active" : "Inactive"}
          </span>
          <span className="row-actions">
            <button
              type="button"
              className="edit-setting"
              onClick={() => onEdit(user)}
              aria-label={`Edit ${user.name}`}
              title="Edit"
            >
              <Pencil size={13} />
            </button>
            {user.id !== currentUserId &&
              (user.active ? (
                <button
                  type="button"
                  className="deactivate-setting"
                  onClick={() => onDeactivate(user)}
                >
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  className="edit-setting"
                  onClick={() => onActivate(user)}
                  disabled={activatingId === user.id}
                >
                  {activatingId === user.id ? <Spinner size={11} /> : "Activate"}
                </button>
              ))}
          </span>
        </div>
      ))}
    </div>
  );
}
