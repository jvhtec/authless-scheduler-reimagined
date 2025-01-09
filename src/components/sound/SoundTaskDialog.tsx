import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table as UITable, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SoundTaskDialogProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TASK_TYPES = [
  "Line Check",
  "Sound Check",
  "Monitor Mix",
  "FOH Mix",
  "Recording Setup",
  "Playback Setup"
];

export const SoundTaskDialog = ({ jobId, open, onOpenChange }: SoundTaskDialogProps) => {
  const { toast } = useToast();

  const { data: managementUsers } = useQuery({
    queryKey: ['management-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('department', 'sound')
        .eq('role', 'management');
      
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
            id,
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

  const handleFileUpload = async (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `sound/tasks/${taskId}/${crypto.randomUUID()}.${fileExt}`;

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
          file_type: file.type,
          file_size: file.size
        });

      if (dbError) throw dbError;

      toast({
        title: "Document uploaded",
        description: "The document has been successfully uploaded.",
      });

      refetchTasks();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (documentId: string, filePath: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('task_documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('task_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted.",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Sound Tasks</h3>
            <p className="text-sm text-muted-foreground">
              Manage sound tasks and assignments
            </p>
          </div>

          <UITable>
            <TableHeader>
              <TableRow>
                <TableCell>Task</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Documents</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TASK_TYPES.map((taskType) => {
                const task = tasks?.find(t => t.task_type === taskType);
                const assignedUser = task?.assigned_to;
                
                return (
                  <TableRow key={taskType}>
                    <TableCell className="font-medium">{taskType}</TableCell>
                    <TableCell>
                      <Select
                        value={assignedUser?.id || ""}
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
                          <SelectValue placeholder="Assign to...">
                            {assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}` : "Assign to..."}
                          </SelectValue>
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
                      <Select
                        value={task?.status || "pending"}
                        onValueChange={async (value) => {
                          if (!task) return;
                          const { error } = await supabase
                            .from('sound_job_tasks')
                            .update({ status: value })
                            .eq('id', task.id);
                          if (error) throw error;
                          refetchTasks();
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={String(task?.progress || 0)}
                        onValueChange={async (value) => {
                          if (!task) return;
                          const { error } = await supabase
                            .from('sound_job_tasks')
                            .update({ progress: parseInt(value) })
                            .eq('id', task.id);
                          if (error) throw error;
                          refetchTasks();
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 25, 50, 75, 100].map((value) => (
                            <SelectItem key={value} value={String(value)}>
                              {value}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {task && <Progress value={task.progress || 0} className="mt-2" />}
                    </TableCell>
                    <TableCell>
                      {task?.task_documents?.map((doc: any) => (
                        <div key={doc.id} className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{doc.file_name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({format(new Date(doc.uploaded_at), 'MMM d, yyyy')})
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleDeleteDocument(doc.id, doc.file_path)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </TableCell>
                    <TableCell>
                      {task && (
                        <div className="relative">
                          <input
                            type="file"
                            onChange={(e) => handleFileUpload(task.id, e)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Button variant="ghost" size="icon">
                            <Upload className="h-4 w-4" />
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
      </DialogContent>
    </Dialog>
  );
};