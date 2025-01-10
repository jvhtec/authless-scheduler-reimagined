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
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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

const TASK_TYPES = ["QT", "Rigging Plot", "Prediccion", "Pesos", "Consumos", "PS"];

const BASE_URL = "https://sectorpro.flexrentalsolutions.com/f5/api/element";
const API_KEY = "82b5m0OKgethSzL1YbrWMUFvxdNkNMjRf82E";

export const SoundTaskDialog = ({ jobId, open, onOpenChange }: SoundTaskDialogProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  // Add query for job details
  const { data: jobDetails } = useQuery({
    queryKey: ['job-details', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await supabase
        .from('jobs')
        .select('name, start_date, end_date, flex_folders_created')
        .eq('id', jobId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!jobId
  });

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

  // Create mutation for updating flex_folders_created status
  const updateFolderStatus = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('jobs')
        .update({ flex_folders_created: true })
        .eq('id', jobId);
      
      if (error) throw error;
    }
  });

  const updatePersonnel = async (field: string, value: number) => {
    try {
      if (!jobId || !personnel?.id) return;

      const { error } = await supabase
        .from('sound_job_personnel')
        .update({ [field]: value })
        .eq('id', personnel.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['sound-personnel', jobId] });

      toast({
        title: "Personnel updated",
        description: "The personnel requirements have been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
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

  const handleDeleteFile = async (taskId: string, documentId: string, filePath: string) => {
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
      // Format document number from start date (YYMMDD)
      const startDate = new Date(jobDetails.start_date);
      const documentNumber = startDate.toISOString().slice(2, 10).replace(/-/g, '');

      const params = {
        projectName: jobDetails.name,
        plannedStartDate: jobDetails.start_date,
        plannedEndDate: jobDetails.end_date,
        documentNumber
      };

      // Create main folder
      const mainFolderPayload = {
        definitionId: "e281e71c-2c42-49cd-9834-0eb68135e9ac",
        parentElementId: null,
        open: true,
        locked: false,
        name: params.projectName,
        plannedStartDate: params.plannedStartDate,
        plannedEndDate: params.plannedEndDate,
        locationId: "2f49c62c-b139-11df-b8d5-00e08175e43e",
        notes: "Automated folder creation from Web App",
        documentNumber,
        personResponsibleId: "4bc2df20-e700-11ea-97d0-2a0a4490a7fb"
      };

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': API_KEY
        },
        body: JSON.stringify(mainFolderPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const mainFolderResult = await response.json();

      // Update folder creation status in database
      await updateFolderStatus.mutateAsync();

      toast({
        title: "Success",
        description: "Flex folders have been created successfully.",
      });

    } catch (error: any) {
      toast({
        title: "Error creating folders",
        description: error.message,
        variant: "destructive"
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
              title={jobDetails?.flex_folders_created ? "Folders already created" : "Create Flex Folders"}
            >
              <img
                src={createFolderIcon}
                alt="Create Flex Folders"
                className="h-6 w-6"
              />
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
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};