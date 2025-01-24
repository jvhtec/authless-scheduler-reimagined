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
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Department } from "@/types/department";

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
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current departments when dialog opens
  useEffect(() => {
    const fetchDepartments = async () => {
      console.log("Fetching departments for job:", job.id);
      const { data, error } = await supabase
        .from("job_departments")
        .select("department")
        .eq("job_id", job.id);

      if (error) {
        console.error("Error fetching departments:", error);
        return;
      }

      const departments = data.map(d => d.department as Department);
      console.log("Current departments:", departments);
      setSelectedDepartments(departments);
    };

    if (open && job.id) {
      fetchDepartments();
    }
  }, [open, job.id]);

  const handleDepartmentToggle = (department: Department) => {
    setSelectedDepartments(prev => 
      prev.includes(department)
        ? prev.filter(d => d !== department)
        : [...prev, department]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log("Updating job:", job.id);

    try {
      // Update job details
      const { error: jobError } = await supabase
        .from("jobs")
        .update({
          title,
          description,
          start_time: startTime,
          end_time: endTime,
        })
        .eq("id", job.id);

      if (jobError) throw jobError;

      // Fetch current departments
      const { data: currentDepts, error: fetchError } = await supabase
        .from("job_departments")
        .select("department")
        .eq("job_id", job.id);

      if (fetchError) throw fetchError;

      const currentDepartments = currentDepts.map(d => d.department);

      // Remove departments that are no longer selected
      const departsToRemove = currentDepartments.filter(
        dept => !selectedDepartments.includes(dept as Department)
      );

      if (departsToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from("job_departments")
          .delete()
          .eq("job_id", job.id)
          .in("department", departsToRemove);

        if (removeError) throw removeError;
      }

      // Add new departments
      const departsToAdd = selectedDepartments.filter(
        dept => !currentDepartments.includes(dept)
      );

      if (departsToAdd.length > 0) {
        const { error: addError } = await supabase
          .from("job_departments")
          .insert(
            departsToAdd.map(department => ({
              job_id: job.id,
              department
            }))
          );

        if (addError) throw addError;
      }

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

  const departments: Department[] = ["sound", "lights", "video"];

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
          <div className="space-y-2">
            <Label>Departments</Label>
            <div className="flex flex-col gap-2">
              {departments.map((department) => (
                <div key={department} className="flex items-center space-x-2">
                  <Checkbox
                    id={`department-${department}`}
                    checked={selectedDepartments.includes(department)}
                    onCheckedChange={() => handleDepartmentToggle(department)}
                  />
                  <Label htmlFor={`department-${department}`} className="capitalize">
                    {department}
                  </Label>
                </div>
              ))}
            </div>
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