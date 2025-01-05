import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Department } from "@/types/department";
import { JobAssignments } from "./JobAssignments";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useState } from "react";
import { toast } from "sonner";

interface JobAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  department: Department;
}

interface LocationData {
  name: string;
}

interface JobData {
  title: string;
  start_time: string;
  locations: LocationData | null;
}

export const JobAssignmentDialog = ({ open, onOpenChange, jobId, department }: JobAssignmentDialogProps) => {
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");

  const { data: technicians, isLoading: isLoadingTechnicians } = useQuery({
    queryKey: ["technicians", department],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("department", department);

      if (error) throw error;
      return data;
    },
  });

  const handleAssign = async () => {
    if (!selectedTechnician || !selectedRole) {
      toast.error("Please select both a technician and a role");
      return;
    }

    try {
      // Get technician details
      const { data: technicianData, error: techError } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", selectedTechnician)
        .single();

      if (techError) throw techError;

      // Get job details including location
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select(`
          title,
          start_time,
          locations (
            name
          )
        `)
        .eq("id", jobId)
        .single();

      if (jobError) throw jobError;

      const typedJobData = jobData as JobData;

      // Create assignment with initial 'invited' status
      const roleField = `${department}_role` as const;
      const { error: assignError } = await supabase
        .from("job_assignments")
        .insert({
          job_id: jobId,
          technician_id: selectedTechnician,
          [roleField]: selectedRole,
          status: 'invited'
        });

      if (assignError) throw assignError;

      // Send email notification
      const { error: emailError } = await supabase.functions.invoke('send-assignment-email', {
        body: {
          to: technicianData.email,
          jobTitle: typedJobData.title,
          technicianName: `${technicianData.first_name} ${technicianData.last_name}`,
          startTime: new Date(typedJobData.start_time).toLocaleString(),
          location: typedJobData.locations?.name || 'Location TBD'
        }
      });

      if (emailError) {
        console.error("Error sending email:", emailError);
        toast.error("Assignment created but failed to send email notification");
        return;
      }

      toast.success("Technician assigned and notification sent");
      setSelectedTechnician("");
      setSelectedRole("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error in assignment process:", error);
      toast.error(error.message);
    }
  };

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Technician</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
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

          <JobAssignments jobId={jobId} department={department} />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign}>
              Assign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};