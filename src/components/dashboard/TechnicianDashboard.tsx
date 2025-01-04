import { Card, CardContent } from "@/components/ui/card";
import { JobCard } from "@/components/jobs/JobCard";
import { JobWithAssignment } from "@/types/job";

interface TechnicianDashboardProps {
  jobs: JobWithAssignment[] | null;
  isLoading: boolean;
  onEditClick: (job: JobWithAssignment) => void;
  onDeleteClick: (jobId: string) => void;
  onJobClick: (jobId: string) => void;
}

export const TechnicianDashboard = ({
  jobs,
  isLoading,
  onEditClick,
  onDeleteClick,
  onJobClick,
}: TechnicianDashboardProps) => {
  return (
    <Card>
      <CardContent className="space-y-4">
        <h2 className="text-xl font-semibold mt-4">My Assigned Jobs</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-4">
            {jobs?.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onEditClick={onEditClick}
                onDeleteClick={onDeleteClick}
                onJobClick={onJobClick}
              />
            ))}
            {!jobs?.length && (
              <p className="text-muted-foreground">No jobs assigned for this time period.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};