import { Department } from "@/types/department";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { TechnicianData } from "@/types/jobAssignment";

interface AssignmentFormProps {
  technicians?: TechnicianData[];
  selectedTechnician: string;
  setSelectedTechnician: (value: string) => void;
  selectedRole: string;
  setSelectedRole: (value: string) => void;
  department: Department;
  onCancel: () => void;
  onAssign: () => void;
}

export const AssignmentForm = ({
  technicians,
  selectedTechnician,
  setSelectedTechnician,
  selectedRole,
  setSelectedRole,
  department,
  onCancel,
  onAssign
}: AssignmentFormProps) => {
  const getRoleOptions = (department: Department) => {
    switch (department) {
      case "sound":
        return ["FOH Engineer", "Monitor Engineer", "PA Tech", "RF Tech"];
      case "lights":
        return ["Lighting Designer", "Lighting Tech", "Follow Spot"];
      case "video":
        return ["Video Director", "Camera Operator", "Video Tech"];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Technician</label>
        <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
          <SelectTrigger>
            <SelectValue placeholder="Select technician" />
          </SelectTrigger>
          <SelectContent>
            {technicians?.map((tech) => (
              <SelectItem key={tech.id} value={tech.id}>
                {tech.first_name} {tech.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Role</label>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {getRoleOptions(department).map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onAssign}>
          Assign
        </Button>
      </div>
    </div>
  );
};