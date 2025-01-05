import { useState } from "react";
import { Profile } from "./types";
import { UserCard } from "./UserCard";
import { EditUserDialog } from "./EditUserDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { useUserManagement } from "./hooks/useUserManagement";

interface UsersListContentProps {
  users: Profile[];
}

export const UsersListContent = ({ users }: UsersListContentProps) => {
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);
  
  const { handleDelete, handleSaveEdit } = useUserManagement();

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          onEdit={setEditingUser}
          onDelete={setDeletingUser}
        />
      ))}

      <EditUserDialog
        user={editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSave={handleSaveEdit}
      />

      <DeleteUserDialog
        user={deletingUser}
        onConfirm={() => deletingUser && handleDelete(deletingUser)}
        onCancel={() => setDeletingUser(null)}
      />
    </div>
  );
};