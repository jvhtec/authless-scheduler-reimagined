import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Department } from "@/types/department";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SimplifiedJobColorPicker } from "./SimplifiedJobColorPicker";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useLocationManagement } from "@/hooks/useLocationManagement";

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDepartment: Department;
}

const CreateJobDialog = ({ open, onOpenChange, currentDepartment }: CreateJobDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [color, setColor] = useState("#7E69AB");
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([currentDepartment]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getOrCreateLocation } = useLocationManagement();

  const availableDepartments: Department[] = ["sound", "lights", "video"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Creating job...");

    try {
      // Get the current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      if (!session?.user) {
        throw new Error("You must be logged in to create a job");
      }

      // Get or create location if provided
      const locationId = location ? await getOrCreateLocation(location) : null;

      // Create the job
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .insert({
          title,
          description,
          start_time: startTime,
          end_time: endTime,
          color,
          created_by: session.user.id,
          location_id: locationId
        })
        .select()
        .single();

      if (jobError) throw jobError;

      console.log("Job created:", jobData);

      // Create the job departments
      const jobDepartments = selectedDepartments.map(department => ({
        job_id: jobData.id,
        department,
      }));

      const { error: deptError } = await supabase
        .from('job_departments')
        .insert(jobDepartments);

      if (deptError) throw deptError;

      console.log("Job departments created");

      // Invalidate the jobs query to refresh the data
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });

      console.log("Job creation completed successfully");

      toast({
        title: "Success",
        description: "Job created successfully",
      });

      // Reset form and close dialog
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      setLocation("");
      setColor("#7E69AB");
      setSelectedDepartments([currentDepartment]);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating job:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      toast({
        title: "Error",
        description: "Failed to create job. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
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
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div>
            <Label>Departments</Label>
            <div className="flex gap-2">
              {availableDepartments.map((dept) => (
                <Button
                  key={dept}
                  type="button"
                  variant={selectedDepartments.includes(dept) ? "default" : "outline"}
                  onClick={() => {
                    setSelectedDepartments((prev) =>
                      prev.includes(dept)
                        ? prev.filter((d) => d !== dept)
                        : [...prev, dept]
                    );
                  }}
                >
                  {dept}
                </Button>
              ))}
            </div>
          </div>
          <SimplifiedJobColorPicker color={color} onChange={setColor} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Job</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateJobDialog;