import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CreateJobDialog from "@/components/jobs/CreateJobDialog";
import CreateTourDialog from "@/components/tours/CreateTourDialog";
import { useJobs } from "@/hooks/useJobs";
import { format } from "date-fns";
import { JobAssignmentDialog } from "@/components/jobs/JobAssignmentDialog";
import { EditJobDialog } from "@/components/jobs/EditJobDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { LightsHeader } from "@/components/lights/LightsHeader";
import { LightsCalendar } from "@/components/lights/LightsCalendar";
import { LightsSchedule } from "@/components/lights/LightsSchedule";
import { Button } from "@/components/ui/button";
import { Scale, Zap } from "lucide-react";

const Lights = () => {
  const navigate = useNavigate();
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [isTourDialogOpen, setIsTourDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [userRole, setUserRole] = useState<string | null>(null);
  const currentDepartment = "lights";
  
  const { data: jobs, isLoading } = useJobs();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log("No session found, redirecting to auth");
        navigate('/auth');
        return;
      }

      console.log("Session found, fetching user role");
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return;
      }

      if (data) {
        console.log("User role fetched:", data.role);
        setUserRole(data.role);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        console.log("Auth state changed: no session, redirecting to auth");
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const getDepartmentJobs = () => {
    if (!jobs) return [];
    return jobs.filter(job => 
      job.job_departments.some(dept => dept.department === currentDepartment)
    );
  };

  const getSelectedDateJobs = () => {
    if (!date || !jobs) return [];
    const selectedDate = format(date, 'yyyy-MM-dd');
    return getDepartmentJobs().filter(job => {
      const jobDate = format(new Date(job.start_time), 'yyyy-MM-dd');
      return jobDate === selectedDate;
    });
  };

  const handleJobClick = (jobId: string) => {
    setSelectedJobId(jobId);
    setIsAssignmentDialogOpen(true);
  };

  const handleEditClick = (job: any) => {
    setSelectedJob(job);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = async (jobId: string) => {
    if (!window.confirm("Are you sure you want to delete this job?")) return;

    try {
      console.log("Starting deletion process for job:", jobId);

      // Delete job assignments
      console.log("Deleting job assignments...");
      const { error: assignmentsError } = await supabase
        .from("job_assignments")
        .delete()
        .eq("job_id", jobId);

      if (assignmentsError) {
        console.error("Error deleting job assignments:", assignmentsError);
        throw assignmentsError;
      }

      // Delete job departments
      console.log("Deleting job departments...");
      const { error: departmentsError } = await supabase
        .from("job_departments")
        .delete()
        .eq("job_id", jobId);

      if (departmentsError) {
        console.error("Error deleting job departments:", departmentsError);
        throw departmentsError;
      }

      // Delete the job
      console.log("Deleting the job...");
      const { error: jobError } = await supabase
        .from("jobs")
        .delete()
        .eq("id", jobId);

      if (jobError) {
        console.error("Error deleting job:", jobError);
        throw jobError;
      }

      console.log("Job deletion completed successfully");
      toast({
        title: "Job deleted successfully",
        description: "The job and all related records have been removed.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    } catch (error: any) {
      console.error("Error in deletion process:", error);
      toast({
        title: "Error deleting job",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <LightsHeader 
          onCreateJob={() => setIsJobDialogOpen(true)}
          onCreateTour={() => setIsTourDialogOpen(true)}
          department="Lights"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <LightsCalendar date={date} onSelect={setDate} />
        <LightsSchedule
          date={date}
          jobs={getSelectedDateJobs()}
          isLoading={isLoading}
          onJobClick={handleJobClick}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
          department="lights"
          userRole={userRole}
        />
      </div>

      <div className="flex gap-4 justify-end">
        <Button 
          variant="outline" 
          onClick={() => navigate('/lights-pesos-tool')}
          className="flex items-center gap-2"
        >
          <Scale className="h-4 w-4" />
          Weight Calculator
        </Button>
        <Button 
          variant="outline" 
          onClick={() => navigate('/lights-consumos-tool')}
          className="flex items-center gap-2"
        >
          <Zap className="h-4 w-4" />
          Power Calculator
        </Button>
      </div>

      <CreateJobDialog
        open={isJobDialogOpen}
        onOpenChange={setIsJobDialogOpen}
        currentDepartment={currentDepartment}
      />
      
      <CreateTourDialog
        open={isTourDialogOpen}
        onOpenChange={setIsTourDialogOpen}
        currentDepartment={currentDepartment}
      />

      {selectedJobId && (
        <JobAssignmentDialog
          open={isAssignmentDialogOpen}
          onOpenChange={setIsAssignmentDialogOpen}
          jobId={selectedJobId}
          department={currentDepartment}
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

export default Lights;