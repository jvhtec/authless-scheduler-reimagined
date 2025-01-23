import { useState, useEffect } from "react";
import { Department } from "@/types/department";
import { useJobs } from "@/hooks/useJobs";
import { format, isWithinInterval, addWeeks, addMonths, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { JobAssignmentDialog } from "@/components/jobs/JobAssignmentDialog";
import { EditJobDialog } from "@/components/jobs/EditJobDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TourChips } from "@/components/dashboard/TourChips";
import { MessageSquare, Send } from "lucide-react";
import { MessagesList } from "@/components/messages/MessagesList";
import { DirectMessagesList } from "@/components/messages/DirectMessagesList";
import { Button } from "@/components/ui/button";
import { DirectMessageDialog } from "@/components/messages/DirectMessageDialog";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { PdfAnalysis } from "@/components/dashboard/PdfAnalysis";

const getSelectedDateJobs = (date: Date | undefined, jobs: any[]) => {
  if (!date || !jobs) return [];
  
  const selectedDate = startOfDay(date);
  
  return jobs.filter(job => {
    if (job.job_type === 'tour') return false;
    
    const jobStartDate = startOfDay(new Date(job.start_time));
    const jobEndDate = endOfDay(new Date(job.end_time));
    
    return isWithinInterval(selectedDate, {
      start: jobStartDate,
      end: jobEndDate
    });
  });
};

const Dashboard = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [timeSpan, setTimeSpan] = useState<string>("1week");
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department>("sound");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [newMessageDialogOpen, setNewMessageDialogOpen] = useState(false);
  
  const { data: jobs, isLoading } = useJobs();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
          const params = new URLSearchParams(window.location.search);
          if (params.get('showMessages') === 'true') {
            setShowMessages(true);
          }
        }
      }
    };

    fetchUserRole();
  }, []);

  const handleJobClick = (jobId: string) => {
    if (userRole === 'logistics') return;
    setSelectedJobId(jobId);
    setIsAssignmentDialogOpen(true);
  };

  const handleEditClick = (job: any) => {
    if (userRole === 'logistics') return;
    setSelectedJob(job);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = async (jobId: string) => {
    if (userRole === 'logistics') return;
    
    if (!window.confirm("Are you sure you want to delete this job?")) return;

    try {
      console.log("Starting job deletion process for job:", jobId);

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
      console.error("Error in deletion process:", error);
      toast({
        title: "Error deleting job",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const selectedDateJobs = getSelectedDateJobs(date, jobs);

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <DashboardHeader timeSpan={timeSpan} onTimeSpanChange={setTimeSpan} />
      
      {userRole === 'management' && (
        <>
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-6 h-6" />
                Messages
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewMessageDialogOpen(true)}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  New Message
                </Button>
                <button
                  onClick={() => setShowMessages(!showMessages)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {showMessages ? 'Hide' : 'Show'}
                </button>
              </div>
            </CardHeader>
            {showMessages && (
              <CardContent>
                <div className="space-y-6">
                  <MessagesList />
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium mb-4">Direct Messages</h3>
                    <DirectMessagesList />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          <PdfAnalysis />
        </>
      )}

      <Card className="w-full bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Tours {new Date().getFullYear()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TourChips 
            onTourClick={(tourId) => {
              if (userRole === 'logistics') return;
              const tour = jobs?.find(job => job.id === tourId);
              if (tour) handleEditClick(tour);
            }} 
          />
        </CardContent>
      </Card>

      <DashboardContent
        date={date}
        setDate={setDate}
        jobs={jobs}
        selectedDateJobs={selectedDateJobs}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
        onJobClick={handleJobClick}
        userRole={userRole}
      />

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

      <DirectMessageDialog
        open={newMessageDialogOpen}
        onOpenChange={setNewMessageDialogOpen}
      />
    </div>
  );
};

export default Dashboard;
