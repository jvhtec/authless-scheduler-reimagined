import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Pencil, Trash2, MapPin, Calendar } from "lucide-react";
import { JobAssignments } from "./JobAssignments";
import { Department } from "@/types/department";

interface JobCardProps {
  job: any;
  onEditClick: (job: any) => void;
  onDeleteClick: (jobId: string) => void;
  onJobClick: (jobId: string) => void;
  showAssignments?: boolean;
  department?: Department;
  userRole?: string | null;
}

export const JobCard = ({
  job,
  onEditClick,
  onDeleteClick,
  onJobClick,
  showAssignments = true,
  department,
  userRole
}: JobCardProps) => {
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditClick(job);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClick(job.id);
  };

  const isTourJob = job.job_type === 'tour' || !!job.tour_date_id;
  const canEdit = userRole !== 'logistics';

  return (
    <div 
      key={job.id} 
      className="flex flex-col border rounded cursor-pointer hover:bg-accent/50 transition-colors group overflow-hidden"
      style={{ 
        borderColor: job.color || '#7E69AB',
        backgroundColor: `${job.color}15` || '#7E69AB15'
      }}
      onClick={() => canEdit && onJobClick(job.id)}
    >
      {/* Header Area */}
      <div 
        className={`flex justify-between items-center p-2 ${isTourJob ? 'bg-accent/20' : ''}`}
        style={{ 
          borderBottom: `1px solid ${job.color || '#7E69AB'}30`
        }}
      >
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <p className="font-medium">{job.title}</p>
            {isTourJob && (
              <span className="text-xs bg-primary/10 px-2 py-0.5 rounded-full ml-2">
                {job.tour_date_id ? 'Tour Date' : 'Tour'}
              </span>
            )}
          </div>
        </div>
        {canEdit && (
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
        )}
      </div>

      {/* Content Area */}
      <div className="p-2 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {format(new Date(job.start_time), 'MMM d, yyyy')}
            {job.start_time !== job.end_time && 
              ` - ${format(new Date(job.end_time), 'MMM d, yyyy')}`
            }
          </span>
        </div>
        
        {job.location?.name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{job.location.name}</span>
          </div>
        )}

        {showAssignments && (
          <JobAssignments 
            jobId={job.id} 
            department={department}
            userRole={userRole}
          />
        )}
      </div>
    </div>
  );
};