import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { JobCard } from "@/components/jobs/JobCard";
import { useToast } from "@/components/ui/use-toast";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { addWeeks, addMonths, isAfter, isBefore } from "date-fns";

const TechnicianDashboard = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeSpan, setTimeSpan] = useState<string>("1week");
  const { toast } = useToast();

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
              location:locations(name)
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

  const handleMessageManagement = () => {
    toast({
      title: "Message Sent",
      description: "Your message has been sent to management.",
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <DashboardHeader timeSpan={timeSpan} onTimeSpanChange={setTimeSpan} />
        <Button onClick={handleMessageManagement} className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Message Management
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            My Upcoming Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading assignments...</p>
          ) : assignments.length === 0 ? (
            <p className="text-muted-foreground">No upcoming assignments found.</p>
          ) : (
            <div className="grid gap-4">
              {assignments.map((assignment) => (
                <JobCard
                  key={assignment.job_id}
                  job={assignment.jobs}
                  onEditClick={() => {}}
                  onDeleteClick={() => {}}
                  onJobClick={() => {}}
                  showAssignments={false}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnicianDashboard;