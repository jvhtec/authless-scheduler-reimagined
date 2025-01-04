import { Card, CardContent } from "@/components/ui/card";
import { JobCard } from "@/components/jobs/JobCard";
import { JobWithAssignment } from "@/types/job";
import { Department } from "@/types/department";

interface KanbanViewProps {
  jobs: JobWithAssignment[];
  department: Department;
  onEditClick: (job: JobWithAssignment) => void;
  onDeleteClick: (jobId: string) => void;
  onJobClick: (jobId: string) => void;
}

export const KanbanView = ({
  jobs,
  department,
  onEditClick,
  onDeleteClick,
  onJobClick,
}: KanbanViewProps) => {
  const filteredJobs = jobs?.filter(job => 
    job.job_departments?.some(d => d.department === department)
  );

  const statuses = ['pending', 'in_progress', 'completed'] as const;

  return (
    <div className="grid grid-cols-3 gap-4">
      {statuses.map(status => (
        <div key={status} className="space-y-4">
          <h3 className="font-semibold capitalize">{status.replace('_', ' ')}</h3>
          <Card>
            <CardContent className="p-4 space-y-4">
              {filteredJobs
                ?.filter(job => job.status === status)
                .map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onEditClick={onEditClick}
                    onDeleteClick={onDeleteClick}
                    onJobClick={onJobClick}
                    department={department}
                  />
                ))}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
};