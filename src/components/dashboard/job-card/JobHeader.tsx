import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { JobType } from "@/types/job";

interface JobHeaderProps {
  title: string;
  jobType: JobType;
  collapsed: boolean;
  onCollapseToggle: (e: React.MouseEvent) => void;
}

export const JobHeader = ({ 
  title, 
  jobType, 
  collapsed, 
  onCollapseToggle 
}: JobHeaderProps) => {
  const getBadgeForJobType = (jobType: JobType) => {
    switch (jobType) {
      case "festival":
        return <Badge className="ml-2 bg-primary text-primary-foreground hover:bg-primary/90">Festival</Badge>;
      case "dryhire":
        return <Badge variant="outline" className="ml-2">Dry Hire</Badge>;
      case "tourdate":
        return <Badge variant="secondary" className="ml-2">Tour Date</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="sm"
        onClick={onCollapseToggle}
        className="p-0 hover:bg-transparent"
      >
        {collapsed ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </Button>
      <span className="ml-2 font-medium">{title}</span>
      {getBadgeForJobType(jobType)}
    </div>
  );
};