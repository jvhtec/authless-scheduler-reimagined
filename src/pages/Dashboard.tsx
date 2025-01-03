import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Department } from "@/types/department";
import { useJobs } from "@/hooks/useJobs";
import { format, addWeeks, addMonths, isAfter, isBefore } from "date-fns";
import { JobAssignmentDialog } from "@/components/jobs/JobAssignmentDialog";
import { JobAssignments } from "@/components/jobs/JobAssignments";

const Dashboard = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [timeSpan, setTimeSpan] = useState<string>("1week");
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department>("sound");
  
  const { data: jobs, isLoading } = useJobs();

  const getTimeSpanEndDate = () => {
    const today = new Date();
    switch (timeSpan) {
      case "1week":
        return addWeeks(today, 1);
      case "2weeks":
        return addWeeks(today, 2);
      case "1month":
        return addMonths(today, 1);
      case "3months":
        return addMonths(today, 3);
      default:
        return addWeeks(today, 1);
    }
  };

  const getDepartmentJobs = (department: Department) => {
    if (!jobs) return [];
    const endDate = getTimeSpanEndDate();
    return jobs.filter(job => 
      job.job_departments.some(dept => dept.department === department) &&
      isAfter(new Date(job.start_time), new Date()) &&
      isBefore(new Date(job.start_time), endDate)
    );
  };

  const getSelectedDateJobs = () => {
    if (!date || !jobs) return [];
    const selectedDate = format(date, 'yyyy-MM-dd');
    return jobs.filter(job => {
      const jobDate = format(new Date(job.start_time), 'yyyy-MM-dd');
      return jobDate === selectedDate;
    });
  };

  const handleJobClick = (jobId: string, department: Department) => {
    setSelectedJobId(jobId);
    setSelectedDepartment(department);
    setIsAssignmentDialogOpen(true);
  };

  const renderJobCards = (jobs: any[]) => {
    return jobs.map(job => (
      <div
        key={job.id}
        className="mb-4 p-4 rounded-lg shadow-sm cursor-pointer hover:bg-accent/50 transition-colors"
        style={{
          borderLeft: `4px solid ${job.color || '#7E69AB'}`,
          backgroundColor: `${job.color}15` || '#7E69AB15'
        }}
        onClick={() => handleJobClick(job.id, job.job_departments[0]?.department || "sound")}
      >
        <h4 className="font-medium">{job.title}</h4>
        <p className="text-sm text-muted-foreground">
          {format(new Date(job.start_time), 'MMM dd, HH:mm')}
        </p>
        {job.location?.name && (
          <p className="text-sm text-muted-foreground mt-1">
            📍 {job.location.name}
          </p>
        )}
        <JobAssignments jobId={job.id} department={job.job_departments[0]?.department} />
      </div>
    ));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
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
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule for {date?.toLocaleDateString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <p className="text-muted-foreground">Loading schedule...</p>
              ) : getSelectedDateJobs().length > 0 ? (
                getSelectedDateJobs().map(job => (
                  <div 
                    key={job.id} 
                    className="flex justify-between items-center p-2 border rounded cursor-pointer hover:bg-accent/50 transition-colors"
                    style={{ 
                      borderColor: job.color || '#7E69AB',
                      backgroundColor: `${job.color}15` || '#7E69AB15'
                    }}
                    onClick={() => handleJobClick(job.id, job.job_departments[0]?.department || "sound")}
                  >
                    <div>
                      <p className="font-medium">{job.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(job.start_time), 'HH:mm')} - {format(new Date(job.end_time), 'HH:mm')}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {job.location?.name}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No events scheduled for this date</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sound Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              renderJobCards(getDepartmentJobs("sound"))
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Lights Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              renderJobCards(getDepartmentJobs("lights"))
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Video Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              renderJobCards(getDepartmentJobs("video"))
            )}
          </CardContent>
        </Card>
      </div>

      {selectedJobId && (
        <JobAssignmentDialog
          open={isAssignmentDialogOpen}
          onOpenChange={setIsAssignmentDialogOpen}
          jobId={selectedJobId}
          department={selectedDepartment}
        />
      )}
    </div>
  );
};

export default Dashboard;