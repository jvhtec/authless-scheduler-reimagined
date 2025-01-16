import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus } from "lucide-react";
import { Department } from "@/types/department";
import { startOfMonth, endOfMonth, addMonths } from "date-fns";
import { MonthNavigation } from "@/components/project-management/MonthNavigation";
import { DepartmentTabs } from "@/components/project-management/DepartmentTabs";
import { useJobManagement } from "@/hooks/useJobManagement";
import { useTabVisibility } from "@/hooks/useTabVisibility";

const ProjectManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<Department>("sound");
  const [currentDate, setCurrentDate] = useState(new Date());

  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);

  // Set up tab visibility handling for jobs query
  useTabVisibility(['jobs']);

  const { jobs, jobsLoading, handleDeleteDocument } = useJobManagement(
    selectedDepartment,
    startDate,
    endDate
  );

  // Check user access
  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        console.log("ProjectManagement: Checking session...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session && mounted) {
          console.log("ProjectManagement: No session found, redirecting to auth");
          navigate('/auth');
          return;
        }

        if (session && mounted) {
          console.log("ProjectManagement: Session found, checking user role");
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error("ProjectManagement: Error fetching profile:", profileError);
            navigate('/dashboard');
            return;
          }

          if (!profile || !['admin', 'logistics', 'management'].includes(profile.role)) {
            console.log("ProjectManagement: Unauthorized access attempt, redirecting to dashboard");
            navigate('/dashboard');
            return;
          }

          console.log("ProjectManagement: Access granted for role:", profile.role);
        }
      } catch (error) {
        console.error("ProjectManagement: Error in access check:", error);
        if (mounted) navigate('/auth');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkAccess();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  // Show loading state when either initial auth check or jobs are loading
  if (loading || jobsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Project Management</CardTitle>
          <Button 
            onClick={() => navigate('/labor-po-form')} 
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Labor PO
          </Button>
        </CardHeader>
        <CardContent>
          <MonthNavigation
            currentDate={currentDate}
            onPreviousMonth={() => setCurrentDate(prev => addMonths(prev, -1))}
            onNextMonth={() => setCurrentDate(prev => addMonths(prev, 1))}
          />
          <DepartmentTabs
            selectedDepartment={selectedDepartment}
            onDepartmentChange={(value) => setSelectedDepartment(value as Department)}
            jobs={jobs || []}
            jobsLoading={jobsLoading}
            onDeleteDocument={handleDeleteDocument}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectManagement;