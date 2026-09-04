import type { AppUser } from "@/types/user";

type UsersTableProps = Readonly<{
  users: AppUser[];
  currentUserId: string;
  onEdit: (user: AppUser) => void;
  onDeactivate: (user: AppUser) => void;
}>;

export function UsersTable({ users, currentUserId, onEdit, onDeactivate }: UsersTableProps) {
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
            <button type="button" className="edit-setting" onClick={() => onEdit(user)}>
              Edit
            </button>
            {user.id !== currentUserId && user.active && (
              <button
                type="button"
                className="delete-setting"
                onClick={() => onDeactivate(user)}
              >
                Deactivate
              </button>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
