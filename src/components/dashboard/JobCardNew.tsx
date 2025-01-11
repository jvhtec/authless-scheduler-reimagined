import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, MapPin, Users, Edit, Trash2, Upload, RefreshCw, ChevronDown, ChevronUp, Download, Eye, FolderPlus } from "lucide-react";
import { format } from "date-fns";
import { Department } from "@/types/department";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { JobDocuments } from "./JobDocuments";
import { Progress } from "@/components/ui/progress";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Flex API constants
const BASE_URL = "https://sectorpro.flexrentalsolutions.com/f5/api/element";
const API_KEY = "82b5m0OKgethSzL1YbrWMUFvxdNkNMjRf82E";

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
  const [collapsed, setCollapsed] = useState(true);
  const [assignments, setAssignments] = useState(job.job_assignments || []);
  const [documents, setDocuments] = useState<JobDocument[]>(job.job_documents || []);
  const [uploading, setUploading] = useState(false);

  const { data: soundTasks, refetch: refetchTasks } = useQuery({
    queryKey: ['sound-tasks', job.id],
    queryFn: async () => {
      if (department !== 'sound') return null;
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
      if (error) throw error;
      return data;
    },
    enabled: department === 'sound'
  });

  const { data: managementUsers } = useQuery({
    queryKey: ['management-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'management');
      if (error) throw error;
      return data;
    }
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

  const refreshData = () => {
    console.log('Refreshing data...');
    queryClient.invalidateQueries({ queryKey: ['sound-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['sound-personnel'] });
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${department}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('task_documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('task_documents')
        .insert({
          file_name: file.name,
          file_path: filePath,
          sound_task_id: department === 'sound' ? soundTasks?.[0]?.id : null,
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

      refreshData();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(!collapsed);
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
      <CardHeader className="pb-2 flex justify-between items-center">
        <div className="flex items-center flex-grow">
          <div className="font-medium">
            {job.title}
            {job.job_type === 'tour' && (
              <Badge variant="secondary" className="ml-2">Tour</Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleCollapse}
            title="Toggle Details"
            className="ml-2"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={refreshData} 
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={createFlexFolders}
            disabled={job.flex_folders_created}
            title={job.flex_folders_created ? "Folders already created" : "Create Flex folders"}
          >
            <FolderPlus className="h-4 w-4" />
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
      
      {/* Basic Info Always Visible */}
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

      {/* Collapsible Section */}
      {!collapsed && (
        <CardContent>
          {/* Personnel Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>FOH Engineers Required</Label>
              <Input
                type="number"
                min="0"
                value={personnel?.foh_engineers}
                onChange={(e) => updatePersonnel('foh_engineers', parseInt(e.target.value))}
                onBlur={(e) => updatePersonnelField('foh_engineers', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>MON Engineers Required</Label>
              <Input
                type="number"
                min="0"
                value={personnel?.mon_engineers}
                onChange={(e) => updatePersonnel('mon_engineers', parseInt(e.target.value))}
                onBlur={(e) => updatePersonnelField('mon_engineers', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>PA Techs Required</Label>
              <Input
                type="number"
                min="0"
                value={personnel?.pa_techs}
                onChange={(e) => updatePersonnel('pa_techs', parseInt(e.target.value))}
                onBlur={(e) => updatePersonnelField('pa_techs', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>RF Techs Required</Label>
              <Input
                type="number"
                min="0"
                value={personnel?.rf_techs}
                onChange={(e) => updatePersonnel('rf_techs', parseInt(e.target.value))}
                onBlur={(e) => updatePersonnelField('rf_techs', parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* Tasks Section */}
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-medium">Total Progress:</span>
              <div className="flex-1">
                <Progress 
                  value={calculateTotalProgress()} 
                  className="h-2"
                />
              </div>
              <span className="text-sm">{calculateTotalProgress()}%</span>
            </div>

            <div className="overflow-x-auto">
              <UITable>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%]">Task</TableHead>
                    <TableHead className="w-[20%]">Assigned To</TableHead>
                    <TableHead className="w-[15%]">Status</TableHead>
                    <TableHead className="w-[15%]">Progress</TableHead>
                    <TableHead className="w-[20%]">Documents</TableHead>
                    <TableHead className="w-[15%]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TASK_TYPES.map((taskType) => {
                    const task = tasks?.find(t => t.task_type === taskType);
                    return (
                      <TableRow key={taskType}>
                        <TableCell className="font-medium truncate max-w-[100px]">
                          {taskType}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={task?.assigned_to?.id || ""}
                            onValueChange={async (value) => {
                              if (!task) {
                                const { error } = await supabase
                                  .from('sound_job_tasks')
                                  .insert({
                                    job_id: job.id,
                                    task_type: taskType,
                                    assigned_to: value,
                                  });
                                if (error) throw error;
                              } else {
                                const { error } = await supabase
                                  .from('sound_job_tasks')
                                  .update({ assigned_to: value })
                                  .eq('id', task.id);
                                if (error) throw error;
                              }
                              refetchTasks();
                            }}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Assign to..." />
                            </SelectTrigger>
                            <SelectContent>
                              {managementUsers?.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.first_name} {user.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {task && (
                            <Select
                              value={task.status}
                              onValueChange={(value) => updateTaskStatus(task.id, value)}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_started">Not Started</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          {task && (
                            <div className="flex items-center gap-1">
                              <Progress 
                                value={task.progress} 
                                className={`h-2 ${getProgressColor(task.status)}`}
                              />
                              <span className="text-xs w-7">{task.progress}%</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-h-[60px] overflow-y-auto">
                            {task?.task_documents?.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between p-1 text-xs"
                              >
                                <span className="truncate max-w-[100px]" title={doc.file_name}>
                                  {doc.file_name}
                                </span>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => handleDownload(doc.file_path, doc.file_name)}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => handleDeleteFile(task.id, doc.id, doc.file_path)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {task && (
                            <div className="relative">
                              <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(task.id, file);
                                }}
                                disabled={uploading}
                              />
                              <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={uploading}
                                className="w-[100px]"
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                Upload
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </UITable>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
