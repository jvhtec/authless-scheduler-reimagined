import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Calendar, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { JobCard } from "@/components/jobs/JobCard";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addWeeks, addMonths } from "date-fns";
import { SendMessage } from "@/components/messages/SendMessage";
import { MessagesList } from "@/components/messages/MessagesList";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface JobDocument {
  id: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
}

const TechnicianDashboard = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeSpan, setTimeSpan] = useState<string>("1week");
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const { toast } = useToast();

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

  const handleDownload = async (jobDocument: JobDocument) => {
    try {
      console.log("Downloading document:", jobDocument);
      
      const { data, error } = await supabase.storage
        .from('job_documents')
        .download(jobDocument.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = jobDocument.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `Downloading ${jobDocument.file_name}`,
      });
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Technician Dashboard</h1>
        <div className="flex items-center gap-4">
          <Select value={timeSpan} onValueChange={setTimeSpan}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time span" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1week">Next Week</SelectItem>
              <SelectItem value="2weeks">Next 2 Weeks</SelectItem>
              <SelectItem value="1month">Next Month</SelectItem>
              <SelectItem value="3months">Next 3 Months</SelectItem>
            </SelectContent>
          </Select>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Message Management
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Messages</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {userDepartment && <SendMessage department={userDepartment} />}
                <MessagesList />
              </div>
            </DialogContent>
          </Dialog>
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
          {loading ? (
            <p className="text-muted-foreground">Loading assignments...</p>
          ) : assignments.length === 0 ? (
            <p className="text-muted-foreground">No upcoming assignments found.</p>
          ) : (
            <div className="grid gap-4">
              {assignments.map((assignment) => (
                <div key={assignment.job_id} className="space-y-4">
                  <JobCard
                    key={assignment.job_id}
                    job={assignment.jobs}
                    onEditClick={() => {}}
                    onDeleteClick={() => {}}
                    onJobClick={() => {}}
                    showAssignments={false}
                  />
                  {assignment.jobs.job_documents?.length > 0 && (
                    <div className="ml-4 space-y-2">
                      <h3 className="text-sm font-medium">Documents:</h3>
                      <div className="grid gap-2">
                        {assignment.jobs.job_documents.map((doc: JobDocument) => (
                          <Button
                            key={doc.id}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2"
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                            {doc.file_name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnicianDashboard;
