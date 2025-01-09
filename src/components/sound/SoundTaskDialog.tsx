import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, Trash2, FolderPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useState } from "react";

interface SoundTaskDialogProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SoundTaskDialog = ({ jobId, open, onOpenChange }: SoundTaskDialogProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

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
    enabled: !!jobId // Only run query when jobId is available
  });

  const { data: personnel } = useQuery({
    queryKey: ['sound-personnel', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      
      const { data, error } = await supabase
        .from('sound_job_personnel')
        .select('*')
        .eq('job_id', jobId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!jobId // Only run query when jobId is available
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

      toast({
        title: "File uploaded successfully",
        description: "The document has been uploaded and linked to the task.",
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
      const { error } = await supabase
        .from('sound_job_tasks')
        .update({ status })
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

  const updateTaskProgress = async (taskId: string, progress: number) => {
    try {
      const { error } = await supabase
        .from('sound_job_tasks')
        .update({ progress })
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

  const updatePersonnel = async (field: string, value: number) => {
    try {
      const { error } = await supabase
        .from('sound_job_personnel')
        .upsert({
          job_id: jobId,
          [field]: value,
        });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const TASK_TYPES = ["QT", "Rigging Plot", "Prediccion", "Pesos", "Consumos", "PS"];

  if (!jobId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Sound Department Tasks</span>
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
            {TASK_TYPES.map((taskType) => {
              const task = tasks?.find(t => t.task_type === taskType);
              return (
                <div key={taskType} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <h3 className="font-medium">{taskType}</h3>
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
                        <SelectTrigger>
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
                    </div>

                    {task && (
                      <div className="flex items-center gap-2">
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
                      </div>
                    )}
                  </div>

                  {task && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Progress</Label>
                          <span className="text-sm text-muted-foreground">
                            {task.progress}%
                          </span>
                        </div>
                        <Input
                          type="range"
                          min="0"
                          max="100"
                          value={task.progress}
                          onChange={(e) => updateTaskProgress(task.id, parseInt(e.target.value))}
                        />
                        <Progress value={task.progress} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Documents</Label>
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
                        </div>
                        <div className="space-y-2">
                          {task.task_documents?.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-2 rounded-md bg-accent/20"
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {doc.file_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Uploaded {format(new Date(doc.uploaded_at), 'MMM d, yyyy HH:mm')}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDownload(doc.file_path, doc.file_name)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteFile(task.id, doc.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
