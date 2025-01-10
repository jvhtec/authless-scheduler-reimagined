import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import createFolderIcon from "@/assets/icons/icon.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, Trash2, Table, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SoundTaskDialogProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AssignedUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface TaskDocument {
  id: string;
  file_name: string;
  file_path: string;
}

interface Task {
  id: string;
  task_type: string;
  assigned_to: AssignedUser | null;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed';
  task_documents?: TaskDocument[];
}

const TASK_TYPES = ["QT", "Rigging Plot", "Prediccion", "Pesos", "Consumos", "PS"];

export const SoundTaskDialog = ({ jobId, open, onOpenChange }: SoundTaskDialogProps) => {
  const [personnel, setPersonnel] = useState({
    foh_engineers: 0,
    mon_engineers: 0,
    pa_techs: 0,
    rf_techs: 0,
  });
  const [jobDetails, setJobDetails] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
            id,
            first_name,
            last_name
          ),
          task_documents (*)
        `)
        .eq('job_id', jobId);
      
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!jobId
  });

  const createFlexFolders = async () => {
    if (!jobDetails || jobDetails.flex_folders_created) {
      toast({
        title: "Folders already created",
        description: "Flex folders have already been created for this job.",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "Creating folders",
        description: "Please wait while the folders are being created...",
      });

      const startDate = new Date(jobDetails.start_date);
      const documentNumber = startDate.toISOString().slice(2, 10).replace(/-/g, '');

      const mainFolderPayload = {
        definitionId: "e281e71c-2c42-49cd-9834-0eb68135e9ac",
        parentElementId: null,
        open: true,
        locked: false,
        name: jobDetails.name,
        plannedStartDate: jobDetails.start_date,
        plannedEndDate: jobDetails.end_date,
        locationId: "2f49c62c-b139-11df-b8d5-00e08175e43e",
        notes: "Automated folder creation from Web App",
        documentNumber,
        personResponsibleId: "4bc2df20-e700-11ea-97d0-2a0a4490a7fb"
      };

      console.log('Sending request to Flex API:', mainFolderPayload); // Debug log

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': API_KEY
        },
        body: JSON.stringify(mainFolderPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const mainFolderResult = await response.json();
      console.log('Flex API response:', mainFolderResult); // Debug log

      await updateFolderStatus.mutateAsync();

      toast({
        title: "Success",
        description: "Flex folders have been created successfully.",
      });

      queryClient.invalidateQueries(['job-details', jobId]);

    } catch (error: any) {
      console.error('Error creating folders:', error); // Debug log
      toast({
        title: "Error creating folders",
        description: error.message,
        variant: "destructive"
      });
    }
  };

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
          sound_task_id: taskId,
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

      refetchTasks();
      
      toast({
        title: "File uploaded",
        description: "The document has been uploaded successfully.",
      });
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

  const handleDeleteFile = async (taskId: string, documentId: string, filePath: string) => {
    try {
      console.log('Deleting file:', filePath); // Debug log

      const { error: storageError } = await supabase.storage
        .from('task_documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('task_documents')
        .delete()
        .eq('id', documentId)
        .eq('task_id', taskId); // Additional safety check

      if (dbError) throw dbError;

      toast({
        title: "File deleted",
        description: "The document has been removed from the task.",
      });

      refetchTasks();
    } catch (error: any) {
      console.error('Delete error:', error); // Debug log
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updatePersonnel = (key: string, value: number) => {
    setPersonnel((prev) => ({ ...prev, [key]: value }));
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

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const progress = status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0;
      
      const { error } = await supabase
        .from('sound_job_tasks')
        .update({ 
          status,
          progress,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;
      refetchTasks();
      
      toast({
        title: "Task updated",
        description: "Task status has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-2 flex flex-row items-center justify-between border-b">
          <DialogTitle className="flex items-center gap-2">
            <Table className="h-5 w-5" />
            <span>Sound Department Tasks</span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={createFlexFolders}
              disabled={!jobDetails || jobDetails.flex_folders_created}
              className="hover:bg-gray-100 group relative"
            >
              <img
                src={createFolderIcon}
                alt="Create Flex Folders"
                className="h-6 w-6"
              />
              <span className="absolute -bottom-8 scale-0 transition-all rounded bg-gray-800 p-2 text-xs text-white group-hover:scale-100 whitespace-nowrap">
                {jobDetails?.flex_folders_created ? "Folders already created" : "Create Flex Folders"}
              </span>
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            {/* Personnel Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Tasks Section */}
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
