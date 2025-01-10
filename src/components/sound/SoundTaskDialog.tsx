import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface SoundTaskDialogProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SoundTaskDialog = ({
  jobId,
  open,
  onOpenChange,
}: SoundTaskDialogProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: tasks } = useQuery({
    queryKey: ["sound-tasks", jobId],
    queryFn: async () => {
      console.log("Fetching sound tasks for job:", jobId);
      const { data, error } = await supabase
        .from("sound_job_tasks")
        .select(`
          *,
          assigned_to (
            first_name,
            last_name
          ),
          task_documents(*)
        `)
        .eq("job_id", jobId);

      if (error) {
        console.error("Error fetching sound tasks:", error);
        throw error;
      }

      console.log("Fetched sound tasks:", data);
      return data;
    },
  });

  const handleFileUpload = async (taskId: string, file: File) => {
    try {
      setIsUploading(true);
      console.log("Starting file upload for task:", taskId);

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `sound/${jobId}/${taskId}/${fileName}`;

      console.log("Generated file path:", filePath);

      const { error: uploadError } = await supabase.storage
        .from("task_documents")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      console.log("File uploaded successfully");

      const { error: dbError } = await supabase.from("task_documents").insert({
        file_name: fileName,
        file_path: filePath,
        sound_task_id: taskId,
      });

      if (dbError) {
        console.error("Database error:", dbError);
        throw dbError;
      }

      console.log("Document record created successfully");
      
      // Refresh tasks data
      queryClient.invalidateQueries({ queryKey: ["sound-tasks", jobId] });
      
      toast.success("Document uploaded successfully");
    } catch (error: any) {
      console.error("Error in upload process:", error);
      toast.error(error.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <div className="space-y-4">
          {tasks?.map((task) => (
            <div
              key={task.id}
              className="p-4 border rounded-lg space-y-2 bg-accent/20"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{task.task_type}</h3>
                <div className="flex items-center gap-2">
                  {task.assigned_to && (
                    <span className="text-sm text-muted-foreground">
                      {task.assigned_to.first_name} {task.assigned_to.last_name}
                    </span>
                  )}
                  <div className="relative">
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(task.id, file);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isUploading}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isUploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                </div>
              </div>
              {task.task_documents?.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium mb-1">Documents:</h4>
                  <ul className="space-y-1">
                    {task.task_documents.map((doc: any) => (
                      <li
                        key={doc.id}
                        className="text-sm text-muted-foreground"
                      >
                        {doc.file_name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};