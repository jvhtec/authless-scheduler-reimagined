import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Assignment } from "@/types/assignment";
import { Department } from "@/types/department";
import { User } from "lucide-react";

interface JobAssignmentsProps {
  jobId: string;
  department?: Department;
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
          profiles (
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
        return assignment.profiles.department === department;
      })
    : assignments;

  if (!filteredAssignments.length) return null;

  const getRoleForDepartment = (assignment: Assignment) => {
    switch (department) {
      case "sound":
        return assignment.sound_role;
      case "lights":
        return assignment.lights_role;
      case "video":
        return assignment.video_role;
      default:
        return assignment.sound_role || assignment.lights_role || assignment.video_role;
    }
  };

  return (
    <div className="space-y-1">
      {filteredAssignments.map((assignment) => {
        const role = getRoleForDepartment(assignment);
        if (!role) return null;
        
        return (
          <div
            key={assignment.id}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <User className="h-4 w-4" />
            <span className="font-medium">
              {assignment.profiles.first_name} {assignment.profiles.last_name}
            </span>
            <span className="text-xs">({role})</span>
          </div>
        );
      })}
    </div>
  );
};