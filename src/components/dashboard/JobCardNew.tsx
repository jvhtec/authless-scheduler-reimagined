import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, MapPin, Users, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface JobCardNewProps {
  job: any;
  onEditClick: (job: any) => void;
  onDeleteClick: (jobId: string) => void;
  onJobClick: (jobId: string) => void;
  showAssignments?: boolean;
  department?: string;
  userRole?: string | null;
}

export const JobCardNew = ({
  job,
  onEditClick,
  onDeleteClick,
  onJobClick,
  userRole
}: JobCardNewProps) => {
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditClick(job);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClick(job.id);
  };

  const canEdit = userRole !== 'logistics';

  // Filter and map assigned technicians, ensuring we have valid data
  const assignedTechnicians = job.job_assignments?.filter((assignment: any) => 
    assignment.technician?.first_name || assignment.technician?.last_name
  ).map((assignment: any) => ({
    id: assignment.technician_id,
    name: `${assignment.technician?.first_name || ''} ${assignment.technician?.last_name || ''}`.trim(),
    role: assignment.sound_role || assignment.lights_role || assignment.video_role
  })) || [];

  console.log('Job assignments:', job.job_assignments);
  console.log('Filtered technicians:', assignedTechnicians);

  return (
    <Card 
      className="mb-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => canEdit && onJobClick(job.id)}
      style={{ 
        borderColor: `${job.color}30` || '#7E69AB30',
        backgroundColor: `${job.color}05` || '#7E69AB05'
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="font-medium">
            {job.title}
            {job.job_type === 'tour' && (
              <Badge variant="secondary" className="ml-2">Tour</Badge>
            )}
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={handleEditClick}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDeleteClick}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {format(new Date(job.start_time), 'HH:mm')}
          </div>
          {job.location?.name && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {job.location.name}
            </div>
          )}
          {assignedTechnicians.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {assignedTechnicians.map((tech: any) => (
                  <Badge 
                    key={tech.id}
                    variant="secondary"
                    className="text-xs"
                  >
                    {tech.name} {tech.role && `(${tech.role})`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};