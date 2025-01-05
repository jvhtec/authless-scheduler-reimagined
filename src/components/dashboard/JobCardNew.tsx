import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Department } from "@/types/department";
import { JobDocument } from "@/types/job";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, ExternalLink } from "lucide-react";

interface JobCardNewProps {
  job: any;
  department: Department;
  onDeleteDocument?: (jobId: string, document: JobDocument) => Promise<void>;
  onEditClick?: (job: any) => void;
  onDeleteClick?: (jobId: string) => void;
  onJobClick?: (jobId: string) => void;
  userRole?: string | null;
}

export const JobCardNew = ({ 
  job, 
  department, 
  onDeleteDocument,
  onEditClick,
  onDeleteClick,
  onJobClick,
  userRole 
}: JobCardNewProps) => {
  console.log("JobCardNew: Rendering job:", { jobId: job.id, department });

  const documents = job.job_documents || [];
  const departmentDocuments = documents.filter((doc: JobDocument) =>
    doc.file_path.startsWith(`${department}/`)
  );

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditClick?.(job);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClick?.(job.id);
  };

  const handleJobClick = () => {
    onJobClick?.(job.id);
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleJobClick}>
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
            {userRole && (userRole === 'admin' || userRole === 'management') && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEditClick}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
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
                    {onDeleteDocument && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDocument(job.id, doc);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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