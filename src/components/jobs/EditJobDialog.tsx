import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface EditJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
}

export const EditJobDialog = ({ open, onOpenChange, job }: EditJobDialogProps) => {
  const [title, setTitle] = useState(job.title);
  const [description, setDescription] = useState(job.description || "");
  const [startTime, setStartTime] = useState(job.start_time?.slice(0, 16) || "");
  const [endTime, setEndTime] = useState(job.end_time?.slice(0, 16) || "");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log("Updating job:", job.id);

    try {
      const { error } = await supabase
        .from("jobs")
        .update({
          title,
          description,
          start_time: startTime,
          end_time: endTime,
        })
        .eq("id", job.id);

      if (error) throw error;

      toast({
        title: "Job updated successfully",
        description: "The job has been updated.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating job:", error);
      toast({
        title: "Error updating job",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};