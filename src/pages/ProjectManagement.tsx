import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/lib/supabase";
import { Loader2, Music2, Lightbulb, Video, Users, Building, Folder, FolderOpen } from "lucide-react";
import { Department } from "@/types/department";
import { useQuery } from "@tanstack/react-query";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  department: string;
}

const ProjectManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<Department>("sound");

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', selectedDepartment],
    queryFn: async () => {
      console.log("Fetching projects for department:", selectedDepartment);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('department', selectedDepartment)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching projects:", error);
        throw error;
      }

      console.log("Projects fetched:", data);
      return data as Project[];
    },
  });

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

  const renderProjects = () => {
    if (projectsLoading) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      );
    }

    if (!projects?.length) {
      return (
        <p className="text-muted-foreground p-4">
          No projects found for this department.
        </p>
      );
    }

    return (
      <Accordion type="single" collapsible className="w-full">
        {projects.map((project) => (
          <AccordionItem key={project.id} value={project.id}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <span>{project.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pl-6">
                <p className="text-sm text-muted-foreground">
                  {project.description || 'No description provided'}
                </p>
                <p className="text-sm">
                  Status: <span className="capitalize">{project.status}</span>
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
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
            <TabsList className="grid w-full grid-cols-6">
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
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="production" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Production
              </TabsTrigger>
            </TabsList>

            {["sound", "lights", "video", "personal", "production"].map((dept) => (
              <TabsContent key={dept} value={dept}>
                <Card>
                  <CardHeader>
                    <CardTitle className="capitalize">{dept} Projects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderProjects()}
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