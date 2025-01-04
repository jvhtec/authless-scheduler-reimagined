import { useState } from "react";
import { format, addWeeks, addMonths, isAfter, isBefore } from "date-fns";
import { JobAssignmentDialog } from "@/components/jobs/JobAssignmentDialog";
import { EditJobDialog } from "@/components/jobs/EditJobDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { JobWithAssignment } from "@/types/job";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CalendarSection } from "@/components/dashboard/CalendarSection";
import { TourChips } from "@/components/dashboard/TourChips";
import { KanbanView } from "@/components/dashboard/KanbanView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Dashboard = () => {
  const [timeSpan, setTimeSpan] = useState<string>("1week");
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobWithAssignment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  
  const { toast } = useToast();

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

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["assigned-jobs", timeSpan],
    queryFn: async () => {
      console.log("Fetching jobs based on user role...");
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          location:locations(name),
          job_departments(department)
        `);

      if (error) throw error;
      return data;
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
    const dateFiltered = jobs.filter(job => 
      isAfter(new Date(job.start_time), new Date()) &&
      isBefore(new Date(job.start_time), endDate)
    );

    if (selectedDate) {
      return dateFiltered.filter(job => {
        const jobDate = new Date(job.start_time);
        return (
          jobDate.getDate() === selectedDate.getDate() &&
          jobDate.getMonth() === selectedDate.getMonth() &&
          jobDate.getFullYear() === selectedDate.getFullYear()
        );
      });
    }

    return dateFiltered;
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
    } catch (error: any) {
      console.error("Error deleting job:", error);
      toast({
        title: "Error deleting job",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredJobs = getFilteredJobs();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <DashboardHeader timeSpan={timeSpan} onTimeSpanChange={setTimeSpan} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <CalendarSection 
            jobs={jobs || []} 
            onDateSelect={setSelectedDate}
          />
          
          <Card>
            <CardContent>
              <Tabs defaultValue="sound" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="sound">Sound</TabsTrigger>
                  <TabsTrigger value="lights">Lights</TabsTrigger>
                  <TabsTrigger value="video">Video</TabsTrigger>
                </TabsList>
                
                <TabsContent value="sound">
                  <KanbanView
                    jobs={filteredJobs}
                    department="sound"
                    onEditClick={handleEditClick}
                    onDeleteClick={handleDeleteClick}
                    onJobClick={handleJobClick}
                  />
                </TabsContent>
                
                <TabsContent value="lights">
                  <KanbanView
                    jobs={filteredJobs}
                    department="lights"
                    onEditClick={handleEditClick}
                    onDeleteClick={handleDeleteClick}
                    onJobClick={handleJobClick}
                  />
                </TabsContent>
                
                <TabsContent value="video">
                  <KanbanView
                    jobs={filteredJobs}
                    department="video"
                    onEditClick={handleEditClick}
                    onDeleteClick={handleDeleteClick}
                    onJobClick={handleJobClick}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <TourChips onTourClick={() => {}} />
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedJobId && (
        <JobAssignmentDialog
          open={isAssignmentDialogOpen}
          onOpenChange={setIsAssignmentDialogOpen}
          jobId={selectedJobId}
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