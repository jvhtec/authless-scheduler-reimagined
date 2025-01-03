import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { JobAssignments } from "./JobAssignments";
import { Department } from "@/types/department";

interface JobCardProps {
  job: any;
  onEditClick: (job: any) => void;
  onDeleteClick: (jobId: string) => void;
  onJobClick: (jobId: string) => void;
  showAssignments?: boolean;
  department?: Department;
}

export const JobCard = ({
  job,
  onEditClick,
  onDeleteClick,
  onJobClick,
  showAssignments = true,
  department
}: JobCardProps) => {
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditClick(job);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClick(job.id);
  };

  return (
    <div 
      key={job.id} 
      className="flex justify-between items-center p-2 border rounded cursor-pointer hover:bg-accent/50 transition-colors group"
      style={{ 
        borderColor: job.color || '#7E69AB',
        backgroundColor: `${job.color}15` || '#7E69AB15'
      }}
      onClick={() => onJobClick(job.id)}
    >
      <div className="flex-1">
        <p className="font-medium">{job.title}</p>
        <p className="text-sm text-muted-foreground">
          {format(new Date(job.start_time), 'HH:mm')} - {format(new Date(job.end_time), 'HH:mm')}
        </p>
        {showAssignments && <JobAssignments jobId={job.id} department={department} />}
      </div>
      <div className="flex items-center gap-2">
        <div className="text-sm text-muted-foreground">
          {job.location?.name}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleEditClick}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeleteClick}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};