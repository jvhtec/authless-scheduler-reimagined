import { useState } from "react";
import { format, addWeeks, addMonths, isAfter, isBefore } from "date-fns";
import { JobAssignmentDialog } from "@/components/jobs/JobAssignmentDialog";
import { EditJobDialog } from "@/components/jobs/EditJobDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { TechnicianDashboard } from "@/components/dashboard/TechnicianDashboard";
import { JobWithAssignment } from "@/types/job";
import CreateJobDialog from "@/components/jobs/CreateJobDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Dashboard = () => {
  const [timeSpan, setTimeSpan] = useState<string>("1week");
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobWithAssignment | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<"sound" | "lights" | "video">("sound");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to get user role
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("profiles")
        .select("role, department")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Query for jobs based on user role
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["assigned-jobs", timeSpan],
    queryFn: async () => {
      console.log("Fetching jobs based on user role...");
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No user found");

      // For admin/management, fetch all jobs
      if (userProfile?.role === 'admin' || userProfile?.role === 'management') {
        const { data, error } = await supabase
          .from("jobs")
          .select(`
            *,
            location:locations(name),
            job_departments(department)
          `);

        if (error) throw error;
        return data;
      }

      // For technicians, fetch only assigned jobs
      const { data, error } = await supabase
        .from("job_assignments")
        .select(`
          job_id,
          sound_role,
          lights_role,
          video_role,
          jobs (
            *,
            location:locations(name),
            job_departments(department)
          )
        `)
        .eq('technician_id', user.id);

      if (error) throw error;

      const transformedJobs = data.map(assignment => ({
        ...assignment.jobs,
        sound_role: assignment.sound_role,
        lights_role: assignment.lights_role,
        video_role: assignment.video_role
      }));

      console.log("Jobs fetched successfully:", transformedJobs);
      return transformedJobs;
    },
    enabled: !!userProfile,
  });

  const getTimeSpanEndDate = () => {
    const today = new Date();
    switch (timeSpan) {
      case "1week": return addWeeks(today, 1);
      case "2weeks": return addWeeks(today, 2);
      case "1month": return addMonths(today, 1);
      case "3months": return addMonths(today, 3);
      default: return addWeeks(today, 1);
    }
  };

  const getFilteredJobs = () => {
    if (!jobs) return [];
    const endDate = getTimeSpanEndDate();
    return jobs.filter(job => 
      isAfter(new Date(job.start_time), new Date()) &&
      isBefore(new Date(job.start_time), endDate)
    );
  };

  const handleJobClick = (jobId: string) => {
    setSelectedJobId(jobId);
    setIsAssignmentDialogOpen(true);
  };

  const handleEditClick = (job: JobWithAssignment) => {
    setSelectedJob(job);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = async (jobId: string) => {
    if (!window.confirm("Are you sure you want to delete this job?")) return;

    try {
      const { error: assignmentsError } = await supabase
        .from("job_assignments")
        .delete()
        .eq("job_id", jobId);

      if (assignmentsError) throw assignmentsError;

      const { error: departmentsError } = await supabase
        .from("job_departments")
        .delete()
        .eq("job_id", jobId);

      if (departmentsError) throw departmentsError;

      const { error: jobError } = await supabase
        .from("jobs")
        .delete()
        .eq("id", jobId);

      if (jobError) throw jobError;

      toast({
        title: "Job deleted successfully",
        description: "The job and all related records have been removed.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["assigned-jobs"] });
    } catch (error: any) {
      console.error("Error deleting job:", error);
      toast({
        title: "Error deleting job",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isAdminOrManagement = userProfile?.role === 'admin' || userProfile?.role === 'management';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {isAdminOrManagement && (
        <div className="flex justify-end">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </div>
      )}

      {isAdminOrManagement ? (
        <AdminDashboard
          timeSpan={timeSpan}
          onTimeSpanChange={setTimeSpan}
          jobs={getFilteredJobs()}
          isLoading={isLoading}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
          onJobClick={handleJobClick}
        />
      ) : (
        <TechnicianDashboard
          jobs={getFilteredJobs()}
          isLoading={isLoading}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
          onJobClick={handleJobClick}
          department={userProfile?.department as "sound" | "lights" | "video"}
        />
      )}

      {selectedJobId && (
        <JobAssignmentDialog
          open={isAssignmentDialogOpen}
          onOpenChange={setIsAssignmentDialogOpen}
          jobId={selectedJobId}
          department={selectedDepartment}
        />
      )}

      {selectedJob && (
        <EditJobDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          job={selectedJob}
        />
      )}

      {isAdminOrManagement && (
        <CreateJobDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          currentDepartment={selectedDepartment}
        />
      )}
    </div>
  );
};

export default Dashboard;