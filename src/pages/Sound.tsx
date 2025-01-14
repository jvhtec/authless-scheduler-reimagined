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
import { Calculator, PieChart, FileText, Sparkles } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const Sound = () => {
  const navigate = useNavigate();
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [isTourDialogOpen, setIsTourDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showAnalysisForm, setShowAnalysisForm] = useState(false);
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
    return jobs.filter(job => {
      const isInDepartment = job.job_departments.some(dept => 
        dept.department === currentDepartment
      );
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
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Job deleted",
        description: "The job has been successfully deleted.",
      });
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (error: any) {
      toast({
        title: "Error deleting job",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAnalysisButtonClick = () => {
    setShowAnalysisForm(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative">
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

      <Card className="mt-8">
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Tools</h2>
          <Separator className="mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate('/pesos-tool')}
            >
              <Calculator className="h-6 w-6" />
              <span>Weight Calculator</span>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate('/consumos-tool')}
            >
              <PieChart className="h-6 w-6" />
              <span>Power Calculator</span>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate('/report-generator')}
            >
              <FileText className="h-6 w-6" />
              <span>SV Report Generator</span>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full h-auto py-4 flex flex-col items-center gap-2"
              onClick={handleAnalysisButtonClick}
            >
              <Sparkles className="h-6 w-6" />
              <span>AI Rider Analysis</span>
            </Button>
          </div>
        </div>
      </Card>

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

      {showAnalysisForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-2xl font-semibold mb-4">Upload PDF Documents</h2>
            <form onSubmit={handleAnalysisSubmit} className="flex flex-col space-y-4">
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileChange}
                className="border border-gray-300 p-2 rounded"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAnalysisForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Submit for Analysis
                </button>
              </div>
            </form>
            {analysisResult && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <h3 className="font-semibold mb-2">Analysis Result:</h3>
                <pre className="whitespace-pre-wrap">{analysisResult}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sound;
