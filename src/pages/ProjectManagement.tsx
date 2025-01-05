import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { Loader2, Music2, Lightbulb, Video } from "lucide-react";
import { Department } from "@/types/department";

const ProjectManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<Department>("sound");

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
            <TabsContent value="sound">
              <Card>
                <CardHeader>
                  <CardTitle>Sound Department</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Sound department management content will go here.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="lights">
              <Card>
                <CardHeader>
                  <CardTitle>Lights Department</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Lights department management content will go here.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="video">
              <Card>
                <CardHeader>
                  <CardTitle>Video Department</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Video department management content will go here.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectManagement;