import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

const ProjectManagement = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      // Get user's role from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // Redirect if user is not admin, logistics, or management
      if (!profile || !['admin', 'logistics', 'management'].includes(profile.role)) {
        navigate('/dashboard');
      }
    };

    checkAccess();
  }, [navigate]);

  return (
    <div className="container mx-auto px-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Welcome to the Project Management dashboard. This section will help you manage and track your projects effectively.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectManagement;