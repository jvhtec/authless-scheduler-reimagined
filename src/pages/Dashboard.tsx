import { useState } from "react";
import { Department } from "@/types/department";
import { format, addWeeks, addMonths, isAfter, isBefore } from "date-fns";
import { JobAssignmentDialog } from "@/components/jobs/JobAssignmentDialog";
import { EditJobDialog } from "@/components/jobs/EditJobDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { JobCard } from "@/components/jobs/JobCard";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Database } from "@/integrations/supabase/types";
import { CalendarSection } from "@/components/dashboard/CalendarSection";
import { TourChips } from "@/components/dashboard/TourChips";

type JobWithAssignment = Database['public']['Tables']['jobs']['Row'] & {
  location?: { name: string | null };
  job_departments?: { department: Department }[];
  sound_role?: string | null;
  lights_role?: string | null;
  video_role?: string | null;
};

type JobAssignmentResponse = {
  job_id: string;
  sound_role: string | null;
  lights_role: string | null;
  video_role: string | null;
  jobs: Database['public']['Tables']['jobs']['Row'] & {
    location: { name: string | null } | null;
    job_departments: { department: Department }[];
  };
}

const Dashboard = () => {
  const [timeSpan, setTimeSpan] = useState<string>("1week");
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobWithAssignment | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department>("sound");
  
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
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Query for jobs based on user role
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["assigned-jobs"],
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

      const transformedJobs = (data as unknown as JobAssignmentResponse[]).map(assignment => ({
        ...assignment.jobs,
        sound_role: assignment.sound_role,
        lights_role: assignment.lights_role,
        video_role: assignment.video_role
      }));

      console.log("Jobs fetched successfully:", transformedJobs);
      return transformedJobs as JobWithAssignment[];
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {(userProfile?.role === 'admin' || userProfile?.role === 'management') ? (
        <>
          <DashboardHeader timeSpan={timeSpan} onTimeSpanChange={setTimeSpan} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardContent className="space-y-4">
                  <h2 className="text-xl font-semibold mt-4">All Jobs</h2>
                  {isLoading ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : (
                    <div className="space-y-4">
                      {jobs?.map(job => (
                        <JobCard
                          key={job.id}
                          job={job}
                          onEditClick={handleEditClick}
                          onDeleteClick={handleDeleteClick}
                          onJobClick={handleJobClick}
                        />
                      ))}
                      {!jobs?.length && (
                        <p className="text-muted-foreground">No jobs found.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div>
              <TourChips onTourClick={() => {}} />
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-xl font-semibold mt-4">My Assigned Jobs</h2>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <div className="space-y-4">
                {jobs?.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onEditClick={handleEditClick}
                    onDeleteClick={handleDeleteClick}
                    onJobClick={handleJobClick}
                  />
                ))}
                {!jobs?.length && (
                  <p className="text-muted-foreground">No jobs assigned for this time period.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
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
    </div>
  );
};

export default Dashboard;