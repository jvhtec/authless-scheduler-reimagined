import { useState, useEffect, ChangeEvent, FormEvent } from "react";
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
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
      // ... deletion logic (omitted for brevity)
    } catch (error: any) {
      // ... error handling
    }
  };

  const handleAnalysisButtonClick = () => {
    setShowAnalysisForm(true);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleAnalysisSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // For each selected file, read its content.
    const fileContents: string[] = await Promise.all(
      selectedFiles.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsText(file); 
        });
      })
    );

    const prompt = `Read carefully these documents and summarize in a table:
- Microphone models with quantities broken down by document name
- Microphone stands type and quantities broken down by document name
- Riser quantities, leg count (4 by riser) and height
(Note: The word for riser in Spanish is "tarima")

Here are the document contents:
${fileContents.map((content, index) => `Document ${index + 1}: ${content}`).join("\n\n")}
    `;

    try {
      const response = await fetch("/api/analyze-documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          toast({
            title: "API Limit Reached",
            description: "The AI service is currently unavailable due to high demand. Please try again later.",
            variant: "destructive"
          });
          return;
        }
        throw new Error(errorData.error?.message || 'Error processing the analysis');
      }

      const data = await response.json();
      setAnalysisResult(data.result);
      toast({
        title: "Analysis complete",
        description: "The documents have been summarized.",
      });
      setShowAnalysisForm(false);
    } catch (error: any) {
      console.error("Error during analysis:", error);
      toast({
        title: "Error",
        description: error.message || "There was an error processing the analysis.",
        variant: "destructive",
      });
    }
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

      {/* Tools Section */}
      <div className="mt-12 p-6 bg-gray-50 rounded-lg shadow-md flex flex-wrap justify-around space-y-4 md:space-y-0">
        <button
          type="button"
          onClick={() => navigate('/pesos-tool')}
          className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-md shadow-sm transition"
        >
          <Calculator className="h-6 w-6 text-gray-700" />
          <span className="text-gray-800 font-medium">Calculadora de pesos</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/consumos-tool')}
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
          onClick={handleAnalysisButtonClick}
          className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-md shadow-sm transition"
        >
          <Sparkles className="h-6 w-6 text-gray-700" />
          <span className="text-gray-800 font-medium">Análisis de riders IA</span>
        </button>
      </div>

      {showAnalysisForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-2xl font-semibold mb-4">Subir documentos PDF</h2>
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
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Enviar para análisis
                </button>
              </div>
            </form>
            {analysisResult && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <h3 className="font-semibold mb-2">Resultado del Análisis:</h3>
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
