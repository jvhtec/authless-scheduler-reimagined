import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { Loader2, Music2, Lightbulb, Video } from "lucide-react";
import { Department } from "@/types/department";
import { useQuery } from "@tanstack/react-query";
import { JobCardNew } from "@/components/dashboard/JobCardNew";
import { useToast } from "@/hooks/use-toast";

interface JobDocument {
  id: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
}

const ProjectManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<Department>("sound");
  const { toast } = useToast();

  const { data: jobs, isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ['jobs', selectedDepartment],
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log("Jobs fetched:", data);
      return data;
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

  const renderJobs = () => {
    if (jobsLoading) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      );
    }

    if (!jobs?.length) {
      return (
        <p className="text-muted-foreground p-4">
          No jobs found for this department.
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {jobs.map((job) => (
          <JobCardNew
            key={job.id}
            job={job}
            onEditClick={() => {}}
            onDeleteClick={() => {}}
            onJobClick={() => {}}
            department={selectedDepartment}
            onDeleteDocument={handleDeleteDocument}
          />
        ))}
      </div>
    );
  };

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
                    {renderJobs()}
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