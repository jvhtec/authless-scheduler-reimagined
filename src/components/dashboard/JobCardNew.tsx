import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ChevronDown, ChevronUp, RefreshCcw } from "lucide-react";
import { SoundTaskDialog } from "@/components/sound/SoundTaskDialog";
import { LightsTaskDialog } from "@/components/lights/LightsTaskDialog";
import { VideoTaskDialog } from "@/components/video/VideoTaskDialog";
import { format } from "date-fns";
import { Job } from "@/types/job";
import { Department } from "@/types/department";
import { ArtistManagementDialog } from "../festival/ArtistManagementDialog";
import { JobDocumentSection } from "./job-card/JobDocumentSection";
import { JobFolderSection } from "./job-card/JobFolderSection";

interface JobCardNewProps {
  job: Job;
  department?: Department;
  userRole?: string;
  onJobClick?: (jobId: string) => void;
}

export const JobCardNew = ({
  job,
  department,
  userRole,
  onJobClick,
}: JobCardNewProps) => {
  const [collapsed, setCollapsed] = useState(true);
  const queryClient = useQueryClient();
  const toast = useToast();

  const handleCardClick = () => {
    if (onJobClick) {
      onJobClick(job.id);
    }
  };

  const handleCollapseToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(!collapsed);
  };

  const getBadgeForJobType = (jobType: string) => {
    switch (jobType) {
      case "festival":
        return <Badge className="ml-2">Festival</Badge>;
      case "dryhire":
        return <Badge variant="outline" className="ml-2">Dry Hire</Badge>;
      case "tourdate":
        return <Badge variant="secondary" className="ml-2">Tour Date</Badge>;
      default:
        return null;
    }
  };

  const refreshData = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    toast({
      title: "Refreshed",
      description: "The job data has been refreshed."
    });
  };

  const canEdit = ["admin", "management"].includes(userRole || "");

  return (
    <>
      <Card
        className={`w-full mb-4 cursor-pointer hover:bg-accent/50 transition-colors ${
          !collapsed ? "bg-accent/25" : ""
        }`}
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCollapseToggle}
                className="p-0 hover:bg-transparent"
              >
                {collapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
              <span className="ml-2 font-medium">{job.title}</span>
              {getBadgeForJobType(job.job_type)}
            </div>
            <div className="flex items-center">
              <JobFolderSection job={job} canEdit={canEdit} />
              <Button
                variant="ghost"
                size="sm"
                className="ml-2"
                onClick={refreshData}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!collapsed && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Start:</span>
                  <span className="text-sm ml-2">
                    {format(new Date(job.start_time), "PPp")}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">End:</span>
                  <span className="text-sm ml-2">
                    {format(new Date(job.end_time), "PPp")}
                  </span>
                </div>
              </div>

              <JobDocumentSection
                job={job}
                department={department}
                canEdit={canEdit}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
