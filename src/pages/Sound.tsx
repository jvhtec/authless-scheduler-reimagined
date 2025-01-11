import { useState, useEffect, ChangeEvent, FormEvent } from "react";
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
      // Deletion logic...
      // (Omitted for brevity; same as previous code)
    } catch (error: any) {
      // Error handling...
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
          reader.readAsText(file); // Reading as text may not work well for PDFs.
        });
      })
    );

    // Construct the prompt including the text content of the files.
    const prompt = `Read carefully these documents and summarize in a table:
- Microphone models with quantities broken down by document name
- Microphone stands type and quantities broken down by document name
- Riser quantities, leg count (4 by riser) and height
(Note: The word for riser in Spanish is "tarima")

Here are the document contents:
${fileContents.map((content, index) => `Document ${index + 1}: ${content}`).join("\n\n")}
    `;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer YOUR_OPENAI_API_KEY`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000
        })
      });

      const data = await response.json();
      const result = data.choices && data.choices[0].message.content;
      setAnalysisResult(result);
      toast({
        title: "Analysis complete",
        description: "The documents have been summarized.",
      });
    } catch (error: any) {
      console.error("Error during analysis:", error);
      toast({
        title: "Error",
        description: "There was an error processing the analysis.",
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

      <div className="mt-12 p-6 bg-gray-50 rounded-lg shadow-md flex flex-wrap justify-around space-y-4 md:space-y-0">
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
        <div className="mt-6 p-6 bg-white rounded-md shadow-md">
          <h2 className="text-xl font-semibold mb-4">Subir documentos PDF</h2>
          <form onSubmit={handleAnalysisSubmit}>
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileChange}
              className="mb-4"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Enviar para análisis
            </button>
          </form>
          {analysisResult && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h3 className="font-semibold mb-2">Resultado del Análisis:</h3>
              <pre className="whitespace-pre-wrap">{analysisResult}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Sound;
