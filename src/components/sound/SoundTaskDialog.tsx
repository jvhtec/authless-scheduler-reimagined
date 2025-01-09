import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, Trash2, FolderPlus, Table } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useState } from "react";
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SoundTaskDialogProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TASK_TYPES = ["QT", "Rigging Plot", "Prediccion", "Pesos", "Consumos", "PS"];

export const SoundTaskDialog = ({ jobId, open, onOpenChange }: SoundTaskDialogProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: managementUsers } = useQuery({
    queryKey: ['management-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('role', ['management', 'admin']);
      
      if (error) throw error;
      return data;
    }
  });

  const { data: tasks, refetch: refetchTasks } = useQuery({
    queryKey: ['sound-tasks', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      
      const { data, error } = await supabase
        .from('sound_job_tasks')
        .select(`
          *,
          assigned_to (
            first_name,
            last_name
          ),
          task_documents (*)
        `)
        .eq('job_id', jobId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!jobId
  });

  const { data: personnel } = useQuery({
    queryKey: ['sound-personnel', jobId],
    queryFn: async () => {
      if (!jobId) return null;

      const { data: existingData, error: fetchError } = await supabase
        .from('sound_job_personnel')
        .select('*')
        .eq('job_id', jobId)
        .maybeSingle();
      
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (!existingData) {
        const { data: newData, error: insertError } = await supabase
          .from('sound_job_personnel')
          .insert({
            job_id: jobId,
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
    enabled: !!jobId
  });

  const handleFileUpload = async (taskId: string, file: File) => {
    try {
      setUploading(true);
      const filePath = `${taskId}/${crypto.randomUUID()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('task_documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('task_documents')
        .insert({
          task_id: taskId,
          file_name: file.name,
          file_path: filePath,
        });

      if (dbError) throw dbError;

      await supabase
        .from('sound_job_tasks')
        .update({ 
          status: 'completed',
          progress: 100 
        })
        .eq('id', taskId);

      toast({
        title: "File uploaded successfully",
        description: "The document has been uploaded and task marked as completed.",
      });

      refetchTasks();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('task_documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = async (taskId: string, documentId: string) => {
    try {
      const { error } = await supabase
        .from('task_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "File deleted",
        description: "The document has been removed from the task.",
      });

      refetchTasks();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const progress = status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0;
      
      const { error } = await supabase
        .from('sound_job_tasks')
        .update({ 
          status,
          progress 
        })
        .eq('id', taskId);

      if (error) throw error;
      refetchTasks();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const calculateTotalProgress = () => {
    if (!tasks?.length) return 0;
    const totalProgress = tasks.reduce((acc, task) => acc + (task.progress || 0), 0);
    return Math.round(totalProgress / tasks.length);
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      default:
        return 'bg-gray-300';
    }
  };

  if (!jobId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Table className="h-5 w-5" />
              <span>Sound Department Tasks</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              title="Create Flex Folders"
              className="group relative"
            >
              <FolderPlus className="h-4 w-4" />
              <span className="absolute -top-8 scale-0 transition-all group-hover:scale-100 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded">
                Create Flex Folders
              </span>
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>FOH Engineers Required</Label>
              <Input
                type="number"
                min="0"
                value={personnel?.foh_engineers || 0}
                onChange={(e) => updatePersonnel('foh_engineers', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>MON Engineers Required</Label>
              <Input
                type="number"
                min="0"
                value={personnel?.mon_engineers || 0}
                onChange={(e) => updatePersonnel('mon_engineers', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>PA Techs Required</Label>
              <Input
                type="number"
                min="0"
                value={personnel?.pa_techs || 0}
                onChange={(e) => updatePersonnel('pa_techs', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>RF Techs Required</Label>
              <Input
                type="number"
                min="0"
                value={personnel?.rf_techs || 0}
                onChange={(e) => updatePersonnel('rf_techs', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-4">
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

            <UITable>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TASK_TYPES.map((taskType) => {
                  const task = tasks?.find(t => t.task_type === taskType);
                  return (
                    <TableRow key={taskType}>
                      <TableCell className="font-medium">{taskType}</TableCell>
                      <TableCell>
                        <Select
                          value={task?.assigned_to?.id || ""}
                          onValueChange={async (value) => {
                            if (!task) {
                              const { error } = await supabase
                                .from('sound_job_tasks')
                                .insert({
                                  job_id: jobId,
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
                          <SelectTrigger className="w-[200px]">
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
                            <SelectTrigger className="w-[140px]">
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
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={task.progress} 
                              className={`h-2 ${getProgressColor(task.status)}`}
                            />
                            <span className="text-sm w-9">{task.progress}%</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {task?.task_documents?.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-1 text-sm"
                          >
                            <span className="truncate max-w-[150px]" title={doc.file_name}>
                              {doc.file_name}
                            </span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleDownload(doc.file_path, doc.file_name)}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleDeleteFile(task.id, doc.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
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
                            <Button variant="outline" size="sm" disabled={uploading}>
                              <Upload className="h-4 w-4 mr-2" />
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
      </DialogContent>
    </Dialog>
  );
};
