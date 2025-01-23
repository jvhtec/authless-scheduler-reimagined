import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobCard } from "@/components/jobs/JobCard";

interface TodayScheduleProps {
  jobs: any[];
  onEditClick: (job: any) => void;
  onDeleteClick: (jobId: string) => void;
  onJobClick: (jobId: string) => void;
  userRole: string | null;
  selectedDate?: Date;
}

export const TodaySchedule = ({
  jobs,
  onEditClick,
  onDeleteClick,
  onJobClick,
  userRole,
  selectedDate,
}: TodayScheduleProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Schedule</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onEditClick={onEditClick}
              onDeleteClick={onDeleteClick}
              onJobClick={(jobId) => onJobClick(jobId)}
              userRole={userRole}
              department="sound"
              selectedDate={selectedDate}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};