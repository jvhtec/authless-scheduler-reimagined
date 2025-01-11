import { useState, useEffect } from "react";
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
import { Calculator, PieChart, FileText, Sparkles } from 'lucide-react';

const Sound = () => {
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [isTourDialogOpen, setIsTourDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [userRole, setUserRole] = useState<string | null>(null);
  const currentDepartment = "sound";

  const { data: jobs, isLoading } = useJobs();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return;
      }

      if (data) {
        setUserRole(data.role);
      }
    };

    fetchUserRole();
  }, []);

  const getDepartmentJobs = () => {
    if (!jobs) return [];
    // Filter out jobs that are related to deleted tours
    return jobs.filter(job => {
      const isInDepartment = job.job_departments.some(dept => 
        dept.department === currentDepartment
      );
      // If it's a tour job, make sure the tour_date_id exists and is valid
      if (job.tour_date_id) {
        return isInDepartment && job.tour_date;
      }
      return isInDepartment;
    });
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
      <LightsHeader 
        onCreateJob={() => setIsJobDialogOpen(true)}
        onCreateTour={() => setIsTourDialogOpen(true)}
        department="Sound"
      />

      <div className="grid md:grid-cols-2 gap-6">
        <LightsCalendar date={date} onSelect={setDate} />
        <LightsSchedule
          date={date}
          jobs={getSelectedDateJobs()}
          isLoading={isLoading}
          onJobClick={handleJobClick}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
          department="sound"
          userRole={userRole}
        />
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

      {/* New section for future feature buttons */}
      <div className="mt-12 p-6 bg-gray-50 rounded-lg shadow-md flex flex-wrap justify-around space-y-4 md:space-y-0">
        <button
          type="button"
          className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-md shadow-sm transition"
        >
          <Calculator className="h-6 w-6 text-gray-700" />
          <span className="text-gray-800 font-medium">Calculadora de pesos</span>
        </button>

        <button
          type="button"
          className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-md shadow-sm transition"
        >
          <PieChart className="h-6 w-6 text-gray-700" />
          <span className="text-gray-800 font-medium">Calculadora de consumos</span>
        </button>

        <button
          type="button"
          className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-md shadow-sm transition"
        >
          <FileText className="h-6 w-6 text-gray-700" />
          <span className="text-gray-800 font-medium">Generador de informes SV</span>
        </button>

        <button
          type="button"
          className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-md shadow-sm transition"
        >
          <Sparkles className="h-6 w-6 text-gray-700" />
          <span className="text-gray-800 font-medium">Análisis de riders IA</span>
        </button>
      </div>
    </div>
  );
};

export default Sound;
