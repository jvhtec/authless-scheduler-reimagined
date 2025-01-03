import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Assignment } from "@/types/assignment";
import { Department } from "@/types/department";

interface JobAssignmentsProps {
  jobId: string;
  department?: Department;
}

interface TechnicianData {
  first_name: string;
  last_name: string;
  email: string;
  department: Department;
}

export const JobAssignments = ({ jobId, department }: JobAssignmentsProps) => {
  const { data: assignments } = useQuery({
    queryKey: ["job-assignments", jobId],
    queryFn: async () => {
      console.log("Fetching assignments for job:", jobId);
      const { data, error } = await supabase
        .from("job_assignments")
        .select(`
          *,
          technician:profiles (
            first_name,
            last_name,
            email,
            department
          )
        `)
        .eq("job_id", jobId);

      if (error) {
        console.error("Error fetching assignments:", error);
        throw error;
      }

      if (!data) return [];

      console.log("Assignments data:", data);
      return data as unknown as Assignment[];
    },
  });

  if (!assignments?.length) return null;

  // Filter assignments based on department if specified
  const filteredAssignments = department
    ? assignments.filter(assignment => {
        const technicianData = assignment.technician as unknown as TechnicianData;
        return technicianData.department === department;
      })
    : assignments;

  if (!filteredAssignments.length) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium mb-2">Current Assignments</h3>
      <div className="space-y-1">
        {filteredAssignments.map((assignment) => {
          const role = assignment.sound_role || assignment.lights_role || assignment.video_role;
          const technicianData = assignment.technician as unknown as TechnicianData;
          
          return (
            <div
              key={assignment.id}
              className="text-sm text-muted-foreground flex items-center gap-1"
            >
              <span className="font-medium">
                {technicianData.first_name} {technicianData.last_name}
              </span>
              <span className="text-xs">({role})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};