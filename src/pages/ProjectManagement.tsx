import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { Music2, Lightbulb, Video, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Department } from "@/types/department";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { DepartmentTabContent } from "@/components/dashboard/DepartmentTabContent";
import { JobDocument } from "@/types/job";
import { Button } from "@/components/ui/button";
import { startOfMonth, endOfMonth, addMonths, format } from "date-fns";

const ProjectManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<Department>("sound");
  const [currentDate, setCurrentDate] = useState(new Date());
  const { toast } = useToast();

  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);

  const { data: jobs, isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ['jobs', selectedDepartment, startDate, endDate],
    queryFn: async () => {
      console.log("Fetching jobs for department:", selectedDepartment);
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          location:locations(name),
          job_departments!inner(department),
          job_assignments(
            technician_id,
            sound_role,
            lights_role,
            video_role,
            profiles(
              first_name,
              last_name
            )
          ),
          job_documents(
            id,
            file_name,
            file_path,
            uploaded_at
          )
        `)
        .eq('job_departments.department', selectedDepartment)
        .eq('job_type', 'single')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      const jobsWithFilteredDocs = data.map(job => ({
        ...job,
        job_documents: job.job_documents.filter((doc: any) => {
          console.log("Checking document path:", doc.file_path, "for department:", selectedDepartment);
          return doc.file_path.startsWith(`${selectedDepartment}/`);
        })
      }));
      
      console.log("Jobs fetched with filtered documents:", jobsWithFilteredDocs);
      return jobsWithFilteredDocs;
    }
  });

  const handleDeleteDocument = async (jobId: string, document: JobDocument) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('job_documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('job_documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted.",
      });

      refetchJobs();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(prev => addMonths(prev, -1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  useEffect(() => {
    const checkAccess = async () => {
      try {
        console.log("Checking session...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log("No session found, redirecting to auth");
          navigate('/auth');
          return;
        }

        console.log("Session found, checking user role");
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          navigate('/dashboard');
          return;
        }

        if (!profile || !['admin', 'logistics', 'management'].includes(profile.role)) {
          console.log("Unauthorized access attempt, redirecting to dashboard");
          navigate('/dashboard');
          return;
        }

        console.log("Access granted for role:", profile.role);
      } catch (error) {
        console.error("Error in access check:", error);
        navigate('/auth');
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <h2 className="text-lg font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <Tabs defaultValue="sound" onValueChange={(value) => setSelectedDepartment(value as Department)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sound" className="flex items-center gap-2">
                <Music2 className="h-4 w-4" />
                Sound
              </TabsTrigger>
              <TabsTrigger value="lights" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Lights
              </TabsTrigger>
              <TabsTrigger value="video" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Video
              </TabsTrigger>
            </TabsList>

            {["sound", "lights", "video"].map((dept) => (
              <TabsContent key={dept} value={dept}>
                <Card>
                  <CardHeader>
                    <CardTitle className="capitalize">{dept} Jobs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DepartmentTabContent
                      department={dept as Department}
                      jobs={jobs || []}
                      isLoading={jobsLoading}
                      onDeleteDocument={handleDeleteDocument}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectManagement;