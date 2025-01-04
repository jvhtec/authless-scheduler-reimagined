import { useState } from "react";
import { Department } from "@/types/department";
import { useJobs } from "@/hooks/useJobs";
import { format, addWeeks, addMonths, isAfter, isBefore } from "date-fns";
import { JobAssignmentDialog } from "@/components/jobs/JobAssignmentDialog";
import { EditJobDialog } from "@/components/jobs/EditJobDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { JobCard } from "@/components/jobs/JobCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { LightsCalendar } from "@/components/lights/LightsCalendar";
import { LightsSchedule } from "@/components/lights/LightsSchedule";
import { TourChips } from "@/components/dashboard/TourChips";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Dashboard = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [timeSpan, setTimeSpan] = useState<string>("1week");
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department>("sound");
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const { data: jobs, isLoading } = useJobs();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
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
          setUserRole(data.role);
        }
      }
    };

    fetchUserRole();
  }, []);

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

  const getDepartmentJobs = (department: Department) => {
    if (!jobs) return [];
    const endDate = getTimeSpanEndDate();
    return jobs.filter(job => 
      job.job_departments.some(dept => dept.department === department) &&
      isAfter(new Date(job.start_time), new Date()) &&
      isBefore(new Date(job.start_time), endDate) &&
      job.job_type !== 'tour' // Filter out tour type jobs
    );
  };

  const getSelectedDateJobs = () => {
    if (!date || !jobs) return [];
    const selectedDate = format(date, 'yyyy-MM-dd');
    return jobs.filter(job => {
      const jobDate = format(new Date(job.start_time), 'yyyy-MM-dd');
      return jobDate === selectedDate && job.job_type !== 'tour'; // Filter out tour type jobs
    });
  };

  const handleJobClick = (jobId: string, department: Department) => {
    if (userRole === 'logistics') return; // Prevent logistics users from assigning technicians
    setSelectedJobId(jobId);
    setSelectedDepartment(department);
    setIsAssignmentDialogOpen(true);
  };

  const handleEditClick = (job: any) => {
    if (userRole === 'logistics') return; // Prevent logistics users from editing jobs
    setSelectedJob(job);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = async (jobId: string) => {
    if (userRole === 'logistics') return; // Prevent logistics users from deleting jobs
    
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
      
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
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
    <div className="container mx-auto px-4 space-y-6">
      <DashboardHeader timeSpan={timeSpan} onTimeSpanChange={setTimeSpan} />
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Tours {new Date().getFullYear()}</CardTitle>
        </CardHeader>
        <CardContent>
          <TourChips 
            onTourClick={(tourId) => {
              if (userRole === 'logistics') return; // Prevent logistics users from editing tours
              const tour = jobs?.find(job => job.id === tourId);
              if (tour) handleEditClick(tour);
            }} 
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="w-full">
          <LightsCalendar date={date} onSelect={setDate} />
        </div>
        <div className="w-full">
          <LightsSchedule
            date={date}
            jobs={getSelectedDateJobs()}
            isLoading={isLoading}
            onJobClick={(jobId) => handleJobClick(jobId, "sound")}
            onEditClick={handleEditClick}
            onDeleteClick={handleDeleteClick}
            userRole={userRole}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {["sound", "lights", "video"].map((dept) => (
          <Card key={dept} className="w-full">
            <CardHeader 
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate(`/${dept}`)}
            >
              <CardTitle className="capitalize">{dept} Schedule</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px] overflow-y-auto">
              {isLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                getDepartmentJobs(dept as Department).map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onEditClick={handleEditClick}
                    onDeleteClick={handleDeleteClick}
                    onJobClick={(jobId) => handleJobClick(jobId, dept as Department)}
                    department={dept as Department}
                    userRole={userRole}
                  />
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

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