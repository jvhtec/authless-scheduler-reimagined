import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Department } from "@/types/department";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SimplifiedJobColorPicker } from "./SimplifiedJobColorPicker";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

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

  const availableDepartments: Department[] = ["sound", "lights", "video"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Creating job with data:", {
      title,
      description,
      startTime,
      endTime,
      location,
      color,
      selectedDepartments
    });
    
    try {
      // First, create the job
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .insert({
          title,
          description,
          start_time: startTime,
          end_time: endTime,
          color,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Then, create the job departments
      const jobDepartments = selectedDepartments.map(department => ({
        job_id: jobData.id,
        department,
      }));

      const { error: deptError } = await supabase
        .from('job_departments')
        .insert(jobDepartments);

      if (deptError) throw deptError;

      // If location is provided, first create or find the location
      if (location) {
        const { data: locationData, error: locationError } = await supabase
          .from('locations')
          .insert({ name: location })
          .select()
          .single();

        if (locationError) throw locationError;

        // Update the job with the location_id
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ location_id: locationData.id })
          .eq('id', jobData.id);

        if (updateError) throw updateError;
      }

      // Invalidate the jobs query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['jobs'] });

      toast({
        title: "Success",
        description: "Job created successfully",
      });

      onOpenChange(false);
      
      // Reset form
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      setLocation("");
      setColor("#7E69AB");
      setSelectedDepartments([currentDepartment]);
    } catch (error) {
      console.error("Error creating job:", error);
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
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
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <SimplifiedJobColorPicker value={color} onChange={setColor} />

          <div className="space-y-2">
            <Label>Departments</Label>
            <div className="flex flex-col gap-2">
              {availableDepartments.map((dept) => (
                <div key={dept} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dept-${dept}`}
                    checked={selectedDepartments.includes(dept)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDepartments([...selectedDepartments, dept]);
                      } else {
                        setSelectedDepartments(
                          selectedDepartments.filter((d) => d !== dept)
                        );
                      }
                    }}
                    disabled={dept === currentDepartment}
                  />
                  <Label htmlFor={`dept-${dept}`}>{dept}</Label>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full">Create Job</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateJobDialog;