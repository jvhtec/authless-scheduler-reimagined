import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Department } from "@/types/department";
import { useJobs } from "@/hooks/useJobs";
import { format } from "date-fns";

const Dashboard = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const currentDepartment: Department = "sound";
  
  const { data: jobs, isLoading } = useJobs();

  const getDepartmentJobs = (department: Department) => {
    if (!jobs) return [];
    return jobs.filter(job => 
      job.job_departments.some(dept => dept.department === department)
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
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
                  <div key={job.id} className="flex justify-between items-center p-2 border rounded">
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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sound Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {isLoading ? "Loading..." : `${getDepartmentJobs("sound").length} upcoming events`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lights Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {isLoading ? "Loading..." : `${getDepartmentJobs("lights").length} upcoming events`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Video Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {isLoading ? "Loading..." : `${getDepartmentJobs("video").length} upcoming events`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;