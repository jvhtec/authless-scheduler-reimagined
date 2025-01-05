import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Department } from "@/types/department";
import { JobDocument } from "@/types/job";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface JobCardNewProps {
  job: any;
  department: Department;
  onDeleteDocument: (jobId: string, document: JobDocument) => Promise<void>;
}

export const JobCardNew = ({ job, department, onDeleteDocument }: JobCardNewProps) => {
  console.log("JobCardNew: Rendering job:", { jobId: job.id, department });

  const documents = job.job_documents || [];
  const departmentDocuments = documents.filter((doc: JobDocument) =>
    doc.file_path.startsWith(`${department}/`)
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{job.title}</h3>
              <p className="text-sm text-muted-foreground">
                {format(new Date(job.start_time), "PPp")}
              </p>
              {job.location && (
                <p className="text-sm text-muted-foreground">
                  {job.location.name}
                </p>
              )}
            </div>
          </div>

          {departmentDocuments.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Documents</h4>
              <div className="space-y-2">
                {departmentDocuments.map((doc: JobDocument) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between bg-secondary p-2 rounded-md"
                  >
                    <span className="text-sm truncate">{doc.file_name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteDocument(job.id, doc)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};