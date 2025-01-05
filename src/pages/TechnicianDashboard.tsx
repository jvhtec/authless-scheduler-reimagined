import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { addWeeks, addMonths } from "date-fns";
import { TimeSpanSelector } from "@/components/technician/TimeSpanSelector";
import { MessageManagementDialog } from "@/components/technician/MessageManagementDialog";
import { AssignmentsList } from "@/components/technician/AssignmentsList";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog } from "@/components/ui/dialog";

const TechnicianDashboard = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeSpan, setTimeSpan] = useState<string>("1week");
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const shouldShowMessages = searchParams.get('showMessages') === 'true';
    setShowMessages(shouldShowMessages);
  }, [location.search]);

  useEffect(() => {
    const fetchUserDepartment = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('department')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setUserDepartment(profileData.department);
      }
    };

    fetchUserDepartment();
  }, []);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        console.log("Fetching assignments for user:", user.id);
        
        const endDate = getTimeSpanEndDate();
        
        const { data, error } = await supabase
          .from('job_assignments')
          .select(`
            *,
            jobs!inner (
              *,
              location:locations(name),
              job_documents(
                id,
                file_name,
                file_path,
                uploaded_at
              )
            )
          `)
          .eq('technician_id', user.id)
          .gte('jobs.start_time', new Date().toISOString())
          .lte('jobs.start_time', endDate.toISOString())
          .order('jobs(start_time)', { ascending: true });

        if (error) throw error;
        
        console.log("Fetched assignments:", data);
        setAssignments(data || []);
      } catch (error) {
        console.error("Error fetching assignments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [timeSpan]);

  const getTimeSpanEndDate = () => {
    const today = new Date();
    switch (timeSpan) {
      case "1week": return addWeeks(today, 1);
      case "2weeks": return addWeeks(today, 2);
      case "1month": return addMonths(today, 1);
      case "3months": return addMonths(today, 3);
      default: return addWeeks(today, 1);
    }
  };

  const handleCloseMessages = () => {
    setShowMessages(false);
    navigate('/technician-dashboard');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Technician Dashboard</h1>
        <div className="flex items-center gap-4">
          <TimeSpanSelector value={timeSpan} onValueChange={setTimeSpan} />
          <MessageManagementDialog department={userDepartment} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            My Upcoming Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssignmentsList assignments={assignments} loading={loading} />
        </CardContent>
      </Card>

      {showMessages && (
        <Dialog open={showMessages} onOpenChange={handleCloseMessages}>
          <MessageManagementDialog department={userDepartment} trigger={false} />
        </Dialog>
      )}
    </div>
  );
};

export default TechnicianDashboard;