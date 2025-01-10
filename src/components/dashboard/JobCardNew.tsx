import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, MapPin, Users, Edit, Trash2, Upload, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Department } from "@/types/department";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { JobDocuments } from "./JobDocuments";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface JobDocument {
  id: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
}

interface JobCardNewProps {
  job: any;
  onEditClick: (job: any) => void;
  onDeleteClick: (jobId: string) => void;
  onJobClick: (jobId: string) => void;
  showAssignments?: boolean;
  department?: Department;
  userRole?: string | null;
  onDeleteDocument?: (jobId: string, document: JobDocument) => void;
  showUpload?: boolean;
}

export const JobCardNew = ({
  job,
  onEditClick,
  onDeleteClick,
  onJobClick,
  department,
  userRole,
  onDeleteDocument,
  showUpload = false
}: JobCardNewProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [assignments, setAssignments] = useState(job.job_assignments || []);

  const { data: soundTasks } = useQuery({
    queryKey: ['sound-tasks', job.id],
    queryFn: async () => {
      if (department !== 'sound') return null;

      console.log("Fetching sound tasks for job:", job.id);
      const { data, error } = await supabase
        .from('sound_job_tasks')
        .select(`
          *,
          assigned_to (
            first_name,
            last_name
          ),
          task_documents(*)
        `)
        .eq('job_id', job.id);

      if (error) {
        console.error("Error fetching sound tasks:", error);
        throw error;
      }
      console.log("Fetched sound tasks:", data);
      return data;
    },
    enabled: department === 'sound'
  });

  const { data: personnel } = useQuery({
    queryKey: ['sound-personnel', job.id],
    queryFn: async () => {
      if (department !== 'sound') return null;

      const { data: existingData, error: fetchError } = await supabase
        .from('sound_job_personnel')
        .select('*')
        .eq('job_id', job.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (!existingData) {
        const { data: newData, error: insertError } = await supabase
          .from('sound_job_personnel')
          .insert({
            job_id: job.id,
            foh_engineers: 0,
            mon_engineers: 0,
            pa_techs: 0,
            rf_techs: 0
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newData;
      }

      return existingData;
    },
    enabled: department === 'sound'
  });

  const calculateTotalProgress = () => {
    if (!soundTasks?.length) return 0;
    const totalProgress = soundTasks.reduce((acc, task) => acc + (task.progress || 0), 0);
    return Math.round(totalProgress / soundTasks.length);
  };

  const getCompletedTasks = () => {
    if (!soundTasks?.length) return 0;
    return soundTasks.filter(task => task.status === 'completed').length;
  };

  const getTotalPersonnel = () => {
    if (!personnel) return 0;
    return (
      (personnel.foh_engineers || 0) +
      (personnel.mon_engineers || 0) +
      (personnel.pa_techs || 0) +
      (personnel.rf_techs || 0)
    );
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditClick(job);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClick(job.id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file || !department) return;

    try {
      console.log('Starting file upload for job:', job.id);

      const fileExt = file.name.split('.').pop();
      const filePath = `${department}/${job.id}/${crypto.randomUUID()}.${fileExt}`;

      console.log('Generated file path:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('job_documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully:', uploadData);

      const { error: dbError } = await supabase
        .from('job_documents')
        .insert({
          job_id: job.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      // Refresh the job documents data
      queryClient.invalidateQueries({ queryKey: ['jobs'] });

      toast({
        title: "Document uploaded",
        description: "The document has been successfully uploaded.",
      });

    } catch (error: any) {
      console.error('Error in upload process:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const refreshData = () => {
    // Invalidate queries to force refetch
    queryClient.invalidateQueries({ queryKey: ['sound-tasks', job.id] });
    queryClient.invalidateQueries({ queryKey: ['sound-personnel', job.id] });
  };

  const canEdit = userRole !== 'logistics';

  const assignedTechnicians = assignments.map((assignment: any) => {
    let role = null;

    switch (department) {
      case 'sound':
        role = assignment.sound_role;
        break;
      case 'lights':
        role = assignment.lights_role;
        break;
      case 'video':
        role = assignment.video_role;
        break;
      default:
        role = assignment.sound_role || assignment.lights_role || assignment.video_role;
    }

    if (!role) return null;

    return {
      id: assignment.technician_id,
      name: `${assignment.profiles?.first_name || ''} ${assignment.profiles?.last_name || ''}`.trim(),
      role: role
    };
  }).filter((tech: any) => tech !== null && tech.name !== '');

  return (
    <Card 
      className="mb-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => userRole !== 'logistics' && onJobClick(job.id)}
      style={{ 
        borderColor: `${job.color}30` || '#7E69AB30',
        backgroundColor: `${job.color}05` || '#7E69AB05'
      }}
    >
      <CardHeader className="pb-2 flex justify-between items-start">
        <div className="flex-grow">
          <div className="font-medium">
            {job.title}
            {job.job_type === 'tour' && (
              <Badge variant="secondary" className="ml-2">Tour</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={refreshData} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canEdit && (
            <>
              <Button variant="ghost" size="icon" onClick={handleEditClick}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDeleteClick}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {showUpload && (
            <div className="relative">
              <input
                type="file"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
              <Button variant="ghost" size="icon">
                <Upload className="h-4 w-4" />
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
          {department === 'sound' && personnel && (
            <div className="mt-2 p-2 bg-accent/20 rounded-md">
              <div className="text-xs font-medium mb-1">Required Personnel: {getTotalPersonnel()}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>FOH Engineers: {personnel.foh_engineers || 0}</div>
                <div>MON Engineers: {personnel.mon_engineers || 0}</div>
                <div>PA Techs: {personnel.pa_techs || 0}</div>
                <div>RF Techs: {personnel.rf_techs || 0}</div>
              </div>
            </div>
          )}
          {department === 'sound' && soundTasks?.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Task Progress ({getCompletedTasks()}/{soundTasks.length} completed)</span>
                <span>{calculateTotalProgress()}%</span>
              </div>
              <Progress 
                value={calculateTotalProgress()} 
                className="h-1"
              />
              <div className="space-y-1">
                {soundTasks.map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between text-xs">
                    <span>{task.task_type}</span>
                    <div className="flex items-center gap-2">
                      {task.assigned_to && (
                        <span className="text-muted-foreground">
                          {task.assigned_to.first_name} {task.assigned_to.last_name}
                        </span>
                      )}
                      <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                        {task.status === 'not_started' ? 'Not Started' : 
                         task.status === 'in_progress' ? 'In Progress' : 
                         'Completed'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {job.job_documents && onDeleteDocument && (
            <JobDocuments
              jobId={job.id}
              documents={job.job_documents}
              department={department}
              onDeleteDocument={onDeleteDocument}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
