import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, Edit, Trash2, Plane, Wrench, Star, Moon } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Department } from "@/types/department";

interface JobCardProps {
  job: any;
  onEditClick: (job: any) => void;
  onDeleteClick: (jobId: string) => void;
  onJobClick: (jobId: string) => void;
  department?: Department;
  userRole?: string | null;
  selectedDate?: Date;
}

export const JobCard = ({ 
  job, 
  onEditClick, 
  onDeleteClick, 
  onJobClick,
  department = "sound",
  userRole,
  selectedDate
}: JobCardProps) => {
  // Fetch date type for the selected date
  const { data: dateType } = useQuery({
    queryKey: ['job-date-type', job.id, selectedDate],
    queryFn: async () => {
      if (!selectedDate) return null;
      
      console.log('Fetching date type for job:', job.id, 'date:', format(selectedDate, 'yyyy-MM-dd'));
      
      const { data, error } = await supabase
        .from('job_date_types')
        .select('type')
        .eq('job_id', job.id)
        .eq('date', format(selectedDate, 'yyyy-MM-dd'))
        .maybeSingle();

      if (error) {
        console.error('Error fetching date type:', error);
        throw error;
      }

      console.log('Date type result:', data);
      return data?.type || null;
    },
    enabled: !!selectedDate
  });

  const getDateTypeIcon = () => {
    if (!dateType) return null;

    switch (dateType) {
      case 'travel':
        return <Plane className="h-4 w-4 text-blue-500" />;
      case 'setup':
        return <Wrench className="h-4 w-4 text-yellow-500" />;
      case 'show':
        return <Star className="h-4 w-4 text-green-500" />;
      case 'off':
        return <Moon className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const isMultiDay = new Date(job.end_time).getDate() !== new Date(job.start_time).getDate();

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => userRole !== "logistics" && onJobClick(job.id)}
      style={{
        borderColor: `${job.color}30` || "#7E69AB30",
        backgroundColor: `${job.color}05` || "#7E69AB05"
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{job.title}</span>
            {getDateTypeIcon()}
            {job.job_type === "tour" && (
              <Badge variant="secondary">Tour</Badge>
            )}
            {isMultiDay && (
              <Badge variant="outline" className="text-xs">Multi-day</Badge>
            )}
          </div>
          {userRole !== "logistics" && (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEditClick(job)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteClick(job.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(new Date(job.start_time), "MMM d, yyyy HH:mm")}
              {isMultiDay && ` - ${format(new Date(job.end_time), "MMM d, yyyy HH:mm")}`}
            </span>
          </div>
          {job.location?.name && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{job.location.name}</span>
            </div>
          )}
          {job.job_assignments?.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{job.job_assignments.length} assigned</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};