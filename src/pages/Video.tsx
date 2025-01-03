import { Button } from "@/components/ui/button";
import { useState } from "react";
import CreateJobDialog from "@/components/jobs/CreateJobDialog";
import CreateTourDialog from "@/components/tours/CreateTourDialog";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJobs } from "@/hooks/useJobs";
import { format } from "date-fns";
import { JobAssignmentDialog } from "@/components/jobs/JobAssignmentDialog";

const Video = () => {
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [isTourDialogOpen, setIsTourDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const currentDepartment = "video";
  
  const { data: jobs, isLoading } = useJobs();

  const getDepartmentJobs = () => {
    if (!jobs) return [];
    return jobs.filter(job => 
      job.job_departments.some(dept => dept.department === currentDepartment)
    );
  };

  const getSelectedDateJobs = () => {
    if (!date || !jobs) return [];
    const selectedDate = format(date, 'yyyy-MM-dd');
    return getDepartmentJobs().filter(job => {
      const jobDate = format(new Date(job.start_time), 'yyyy-MM-dd');
      return jobDate === selectedDate;
    });
  };

  const handleJobClick = (jobId: string) => {
    setSelectedJobId(jobId);
    setIsAssignmentDialogOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Video Department</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsJobDialogOpen(true)}>
            Create Job
          </Button>
          <Button variant="outline" onClick={() => setIsTourDialogOpen(true)}>
            Create Tour
          </Button>
        </div>
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
                    onClick={() => handleJobClick(job.id)}
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

      <CreateJobDialog
        open={isJobDialogOpen}
        onOpenChange={setIsJobDialogOpen}
        currentDepartment={currentDepartment}
      />
      
      <CreateTourDialog
        open={isTourDialogOpen}
        onOpenChange={setIsTourDialogOpen}
        currentDepartment={currentDepartment}
      />

      {selectedJobId && (
        <JobAssignmentDialog
          open={isAssignmentDialogOpen}
          onOpenChange={setIsAssignmentDialogOpen}
          jobId={selectedJobId}
          department={currentDepartment}
        />
      )}
    </div>
  );
};

export default Video;