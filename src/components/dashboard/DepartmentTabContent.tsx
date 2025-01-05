import { JobCardNew } from "@/components/dashboard/JobCardNew";
import { Department } from "@/types/department";
import { JobDocument } from "@/types/job";

interface DepartmentTabContentProps {
  department: Department;
  jobs: any[];
  isLoading: boolean;
  onDeleteDocument: (jobId: string, document: JobDocument) => Promise<void>;
}

export const DepartmentTabContent = ({
  department,
  jobs,
  isLoading,
  onDeleteDocument,
}: DepartmentTabContentProps) => {
  console.log("DepartmentTabContent: Rendering with jobs:", {
    jobCount: jobs?.length,
    department,
    isLoading
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Loading jobs...</p>;
  }

  if (!jobs?.length) {
    return <p className="text-muted-foreground">No jobs found</p>;
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <JobCardNew
          key={job.id}
          job={job}
          department={department}
          onDeleteDocument={onDeleteDocument}
        />
      ))}
    </div>
  );
};