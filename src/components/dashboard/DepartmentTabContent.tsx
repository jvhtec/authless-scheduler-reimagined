import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { JobCardNew } from "./JobCardNew";
import { Department } from "@/types/department";
import { JobDocument } from "@/types/job";

interface DepartmentTabContentProps {
  department: Department;
  jobs: any[];
  isLoading: boolean;
  onDeleteDocument: (jobId: string, document: JobDocument) => void;
}

export const DepartmentTabContent = ({
  department,
  jobs,
  isLoading,
  onDeleteDocument
}: DepartmentTabContentProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!jobs?.length) {
    return (
      <p className="text-muted-foreground p-4">
        No jobs found for this department.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <JobCardNew
          key={job.id}
          job={job}
          onEditClick={() => {}}
          onDeleteClick={() => {}}
          onJobClick={() => {}}
          department={department}
          onDeleteDocument={onDeleteDocument}
        />
      ))}
    </div>
  );
};