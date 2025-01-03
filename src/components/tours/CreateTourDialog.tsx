import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { SimplifiedJobColorPicker } from "@/components/jobs/SimplifiedJobColorPicker";
import { SimplifiedTourDateInput } from "./SimplifiedTourDateInput";
import { useLocations } from "@/hooks/useLocations";
import { Department } from "@/types/department";
import { useState } from "react";

interface CreateTourDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDepartment: Department;
}

const CreateTourDialog = ({ open, onOpenChange, currentDepartment }: CreateTourDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dates, setDates] = useState<{ date: string; location: string }[]>([
    { date: "", location: "" },
  ]);
  const [color, setColor] = useState("#7E69AB");
  const [departments, setDepartments] = useState<Department[]>([currentDepartment]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: locations } = useLocations();
  const availableDepartments: Department[] = ["sound", "lights", "video"];

  const handleAddDate = () => {
    setDates([...dates, { date: "", location: "" }]);
  };

  const handleRemoveDate = (index: number) => {
    if (dates.length > 1) {
      const newDates = dates.filter((_, i) => i !== index);
      setDates(newDates);
    }
  };

  const handleDateChange = (
    index: number,
    field: "date" | "location",
    value: string
  ) => {
    const newDates = [...dates];
    newDates[index] = { ...newDates[index], [field]: value };
    setDates(newDates);
  };

  const handleDepartmentChange = (dept: Department, checked: boolean) => {
    if (checked) {
      setDepartments([...departments, dept]);
    } else {
      setDepartments(departments.filter(d => d !== dept));
    }
  };

  const createJobWithDepartments = async (jobData: any) => {
    console.log("Creating job with data:", jobData);
    
    // First, if there's a location, create or get its ID
    let locationId = null;
    if (jobData.location) {
      const { data: locationData, error: locationError } = await supabase
        .from("locations")
        .insert({ name: jobData.location })
        .select()
        .single();

      if (locationError) {
        // If insert fails, try to find existing location
        const { data: existingLocation, error: findError } = await supabase
          .from("locations")
          .select()
          .eq("name", jobData.location)
          .single();

        if (findError) throw findError;
        locationId = existingLocation.id;
      } else {
        locationId = locationData.id;
      }
    }

    // Create the job with location_id instead of location
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({
        ...jobData,
        location_id: locationId,
        location: undefined // Remove the location field
      })
      .select()
      .single();

    if (jobError) throw jobError;

    console.log("Job created:", job);

    // Then create the department associations
    const departmentEntries = departments.map(department => ({
      job_id: job.id,
      department
    }));

    const { error: deptError } = await supabase
      .from("job_departments")
      .insert(departmentEntries);

    if (deptError) throw deptError;

    return job;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for the tour",
        variant: "destructive",
      });
      return;
    }

    if (!dates.every(date => date.date)) {
      toast({
        title: "Error",
        description: "Please select a date for all tour dates",
        variant: "destructive",
      });
      return;
    }

    try {
      const validDates = dates.filter(date => date.date);
      
      if (validDates.length === 0) {
        toast({
          title: "Error",
          description: "At least one valid date is required",
          variant: "destructive",
        });
        return;
      }

      validDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Create the main tour job
      const tourJob = await createJobWithDepartments({
        title,
        description,
        start_time: `${validDates[0].date}T00:00:00`,
        end_time: `${validDates[validDates.length - 1].date}T23:59:59`,
        location: validDates[0].location,
        job_type: "tour",
        color,
      });

      // Create individual tour dates
      for (const date of validDates) {
        await createJobWithDepartments({
          title: `${title} (Tour Date)`,
          description,
          start_time: `${date.date}T00:00:00`,
          end_time: `${date.date}T23:59:59`,
          location: date.location,
          job_type: "single",
          tour_date_id: tourJob.id,
          color,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["locations"] });

      toast({
        title: "Success",
        description: "Tour created successfully",
      });

      onOpenChange(false);
      setTitle("");
      setDescription("");
      setDates([{ date: "", location: "" }]);
      setColor("#7E69AB");
      setDepartments([currentDepartment]);
    } catch (error: any) {
      console.error("Error creating tour:", error);
      toast({
        title: "Error",
        description: "Failed to create tour",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Tour</DialogTitle>
          <DialogDescription>Add a new tour with multiple dates and locations.</DialogDescription>
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
            <Label>Tour Dates</Label>
            <div className="space-y-4">
              {dates.map((date, index) => (
                <SimplifiedTourDateInput
                  key={index}
                  index={index}
                  date={date}
                  onDateChange={handleDateChange}
                  onRemove={() => handleRemoveDate(index)}
                  showRemove={dates.length > 1}
                  locations={locations}
                />
              ))}
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleAddDate}
              >
                Add Date
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Departments</Label>
            <div className="flex flex-col gap-2">
              {availableDepartments.map((dept) => (
                <div key={dept} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dept-${dept}`}
                    checked={departments.includes(dept)}
                    onCheckedChange={(checked) => 
                      handleDepartmentChange(dept, checked as boolean)
                    }
                    disabled={dept === currentDepartment}
                  />
                  <Label htmlFor={`dept-${dept}`}>
                    {dept.charAt(0).toUpperCase() + dept.slice(1)}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <SimplifiedJobColorPicker color={color} onChange={setColor} />

          <Button type="submit" className="w-full">
            Create Tour
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTourDialog;