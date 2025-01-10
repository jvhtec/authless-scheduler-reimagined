// src/components/jobs/JobCard.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Pencil, Trash2, MapPin, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Department } from "@/types/department";
import { useToast } from "@/hooks/use-toast";

interface JobCardProps {
  job: any;
  onEditClick: (job: any) => void;
  onDeleteClick: (jobId: string) => void;
  onJobClick: (jobId: string) => void;
  department?: Department;
  userRole?: string | null;
}

export const JobCard = ({
  job,
  onEditClick,
  onDeleteClick,
  onJobClick,
  department,
  userRole
}: JobCardProps) => {
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(true);
  const [assignments] = useState(job.job_assignments || []);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditClick(job);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClick(job.id);
  };

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(!collapsed);
  };

  const canEdit = userRole !== 'logistics';
  const isTourJob = job.job_type === 'tour' || !!job.tour_date_id;

  // Summarize assigned technicians' names
  const assignedTechnicians = assignments
    .map((assignment: any) => {
      let role = null;
      if (department === 'sound') role = assignment.sound_role;
      else if (department === 'lights') role = assignment.lights_role;
      else if (department === 'video') role = assignment.video_role;
      else role = assignment.sound_role || assignment.lights_role || assignment.video_role;
      if (!role) return null;
      return `${assignment.profiles?.first_name || ''} ${assignment.profiles?.last_name || ''}`.trim();
    })
    .filter((name: string | null) => name && name !== '');

  return (
    <div 
      className="flex flex-col border rounded cursor-pointer hover:bg-accent/50 transition-colors group overflow-hidden"
      style={{ 
        borderColor: job.color || '#7E69AB',
        backgroundColor: `${job.color}15` || '#7E69AB15'
      }}
      onClick={() => canEdit && onJobClick(job.id)}
    >
      {/* Header Area with Always Visible Toggle Button */}
      <div 
        className={`flex justify-between items-center p-2 ${isTourJob ? 'bg-accent/20' : ''}`}
        style={{ 
          borderBottom: `1px solid ${job.color || '#7E69AB'}30`
        }}
      >
        <div className="flex items-center flex-1">
          <p className="font-medium">{job.title}</p>
          {isTourJob && (
            <span className="text-xs bg-primary/10 px-2 py-0.5 rounded-full ml-2">
              {job.tour_date_id ? 'Tour Date' : 'Tour'}
            </span>
          )}
        </div>
        {/* Toggle Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleCollapse}
          className="ml-2"
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
        {canEdit && !collapsed && (
          <div 
            className="flex gap-1 ml-2"
            onClick={e => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" onClick={handleEditClick}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDeleteClick}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Always Visible Summary */}
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

        {assignedTechnicians.length > 0 && (
          <div className="flex flex-col text-sm text-muted-foreground">
            <div>Assigned Personnel:</div>
            <div>{assignedTechnicians.join(', ')}</div>
          </div>
        )}
      </div>

      {/* Expanded Details Placeholder */}
      {!collapsed && (
        <div className="p-2 space-y-2 border-t">
          <p className="text-sm text-muted-foreground">
            Additional job details can be displayed here.
          </p>
        </div>
      )}
    </div>
  );
};
