import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Profile } from "./types";
import { Department } from "@/types/department";

interface EditUserDialogProps {
  user: Profile | null;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedData: Partial<Profile>) => void;
  open: boolean;
}

export const EditUserDialog = ({ user, onOpenChange, onSave, open }: EditUserDialogProps) => {
  if (!user) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updatedData: Partial<Profile> = {
      first_name: formData.get('firstName') as string,
      last_name: formData.get('lastName') as string,
      phone: formData.get('phone') as string,
      department: formData.get('department') as Department,
      dni: formData.get('dni') as string,
      residencia: formData.get('residencia') as string,
    };
    
    // Only include role if user is admin or management
    if (user.role === 'admin' || user.role === 'management') {
      updatedData.role = formData.get('role') as string;
    }
    
    onSave(updatedData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={user.first_name || ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              name="lastName"
              defaultValue={user.last_name || ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={user.phone || ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select name="department" defaultValue={user.department || 'sound'}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sound">Sound</SelectItem>
                <SelectItem value="lights">Lights</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(user.role === 'admin' || user.role === 'management') && (
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select name="role" defaultValue={user.role}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                  <SelectItem value="logistics">Logistics</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="dni">DNI/NIE</Label>
            <Input
              id="dni"
              name="dni"
              defaultValue={user.dni || ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="residencia">Residencia</Label>
            <Input
              id="residencia"
              name="residencia"
              defaultValue={user.residencia || ''}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};