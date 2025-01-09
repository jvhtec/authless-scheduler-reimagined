import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { JobCardNew } from "./JobCardNew";
import { Department } from "@/types/department";
import { JobDocument } from "@/types/job";
import { useState } from "react";
import { SoundTaskDialog } from "@/components/sound/SoundTaskDialog";

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
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

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

  const handleJobClick = (jobId: string) => {
    if (department === 'sound') {
      setSelectedJobId(jobId);
    }
  };

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <JobCardNew
          key={job.id}
          job={job}
          onEditClick={() => {}}
          onDeleteClick={() => {}}
          onJobClick={handleJobClick}
          department={department}
          onDeleteDocument={onDeleteDocument}
          showUpload={true}
        />
      ))}
      
      {department === 'sound' && (
        <SoundTaskDialog
          jobId={selectedJobId!}
          open={!!selectedJobId}
          onOpenChange={(open) => !open && setSelectedJobId(null)}
        />
      )}
    </div>
  );
};