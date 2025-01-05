import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Department } from "@/types/department";
import { JobAssignments } from "./JobAssignments";
import { useState } from "react";
import { toast } from "sonner";
import { AssignmentForm } from "./AssignmentForm";
import { JobData, TechnicianData } from "@/types/jobAssignment";

interface JobAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  department: Department;
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
      return data as TechnicianData[];
    },
  });

  const handleAssign = async () => {
    if (!selectedTechnician || !selectedRole) {
      toast.error("Please select both a technician and a role");
      return;
    }

    try {
      // Check if assignment already exists
      const { data: existingAssignment, error: checkError } = await supabase
        .from("job_assignments")
        .select("*")
        .eq("job_id", jobId)
        .eq("technician_id", selectedTechnician)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingAssignment) {
        toast.error("This technician is already assigned to this job");
        return;
      }

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

      // During development, only send emails to verified addresses
      if (process.env.NODE_ENV === 'development') {
        toast.info("Email sending is limited to verified addresses in development mode");
      }

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

      toast.success("Technician assigned successfully");
      setSelectedTechnician("");
      setSelectedRole("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error in assignment process:", error);
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Technician</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <AssignmentForm
            technicians={technicians}
            selectedTechnician={selectedTechnician}
            setSelectedTechnician={setSelectedTechnician}
            selectedRole={selectedRole}
            setSelectedRole={setSelectedRole}
            department={department}
            onCancel={() => onOpenChange(false)}
            onAssign={handleAssign}
          />

          <JobAssignments jobId={jobId} department={department} />
        </div>
      </DialogContent>
    </Dialog>
  );
};