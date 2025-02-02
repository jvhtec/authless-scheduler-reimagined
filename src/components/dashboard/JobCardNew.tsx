import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";
import { Job } from "@/types/job";
import { Department } from "@/types/department";
import { JobDocumentSection } from "./job-card/JobDocumentSection";
import { JobFolderSection } from "./job-card/JobFolderSection";
import { JobHeader } from "./job-card/JobHeader";
import { JobDateSection } from "./job-card/JobDateSection";
import { cn } from "@/lib/utils";

interface JobCardNewProps {
  job: Job;
  department?: Department;
  userRole?: string | null;
  onJobClick?: (jobId: string) => void;
  onEditClick?: (job: Job) => void;
  onDeleteClick?: (jobId: string) => void;
  onDeleteDocument?: (jobId: string, document: any) => void;
  showUpload?: boolean;
  showManageArtists?: boolean;
  isProjectManagementPage?: boolean;
}

export const JobCardNew = ({
  job,
  department,
  userRole,
  onJobClick,
  onEditClick,
  onDeleteClick,
  onDeleteDocument,
  showUpload = false,
  showManageArtists = false,
  isProjectManagementPage = false,
}: JobCardNewProps) => {
  const [collapsed, setCollapsed] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCardClick = () => {
    if (onJobClick) {
      onJobClick(job.id);
    }
  };

  const handleCollapseToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(!collapsed);
  };

  const refreshData = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      console.log(`Refreshing job ${job.id} data...`);
      await queryClient.invalidateQueries({ 
        queryKey: ["jobs"],
        refetchType: "active",
        exact: false
      });
      toast({
        title: "Refreshed",
        description: "The job data has been refreshed."
      });
    } catch (error) {
      console.error("Error refreshing job data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh job data",
        variant: "destructive"
      });
    }
  };

  const canEdit = ["admin", "management"].includes(userRole || "");

  const cardStyle = cn(
    "w-full mb-4 cursor-pointer transition-all duration-200",
    "hover:bg-accent/50 active:bg-accent/70",
    !collapsed && "bg-accent/25",
    job.color && `border-l-[6px]`,
    job.color && `border-l-[${job.color}]`
  );

  return (
    <Card className={cardStyle} onClick={handleCardClick}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <JobHeader
            title={job.title}
            jobType={job.job_type}
            collapsed={collapsed}
            onCollapseToggle={handleCollapseToggle}
          />
          <div className="flex items-center gap-2">
            <JobFolderSection job={job} canEdit={canEdit} />
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshData}
              className="ml-2"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!collapsed && (
          <div className="mt-4 space-y-4">
            <JobDateSection startTime={job.start_time} endTime={job.end_time} />

            {job.description && (
              <div className="text-sm text-muted-foreground">
                {job.description}
              </div>
            )}

            <JobDocumentSection
              jobId={job.id}
              department={department}
              documents={job.documents || []}
              showUpload={showUpload}
              jobType={job.job_type}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};