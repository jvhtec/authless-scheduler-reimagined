import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { SimplifiedJobColorPicker } from "@/components/jobs/SimplifiedJobColorPicker";
import { Department } from "@/types/department";
import { useState } from "react";
import { useLocations } from "@/hooks/useLocations";
import { TourDateForm } from "./TourDateForm";
import { TourDepartmentSelector } from "./TourDepartmentSelector";

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

      // First, create the tour in the tours table
      const { data: tour, error: tourError } = await supabase
        .from("tours")
        .insert({
          name: title,
          description
        })
        .select()
        .single();

      if (tourError) throw tourError;

      // Create the main tour job
      const { data: mainTourJob, error: mainJobError } = await supabase
        .from("jobs")
        .insert({
          title,
          description,
          start_time: `${validDates[0].date}T00:00:00`,
          end_time: `${validDates[validDates.length - 1].date}T23:59:59`,
          job_type: "tour",
          color,
        })
        .select()
        .single();

      if (mainJobError) throw mainJobError;

      // Create department associations for main tour job
      const mainJobDepartments = departments.map(department => ({
        job_id: mainTourJob.id,
        department
      }));

      const { error: mainDeptError } = await supabase
        .from("job_departments")
        .insert(mainJobDepartments);

      if (mainDeptError) throw mainDeptError;

      // Process each tour date
      for (const dateInfo of validDates) {
        // First get or create location
        const { data: location, error: locationError } = await supabase
          .from("locations")
          .insert({ name: dateInfo.location })
          .select()
          .single();

        if (locationError) throw locationError;
        
        // Create tour date entry
        const { data: tourDate, error: tourDateError } = await supabase
          .from("tour_dates")
          .insert({
            tour_id: tour.id,
            date: dateInfo.date,
            location_id: location.id
          })
          .select()
          .single();

        if (tourDateError) throw tourDateError;

        // Create job for this tour date
        const { data: dateJob, error: dateJobError } = await supabase
          .from("jobs")
          .insert({
            title: `${title} (Tour Date)`,
            description,
            start_time: `${dateInfo.date}T00:00:00`,
            end_time: `${dateInfo.date}T23:59:59`,
            location_id: location.id,
            job_type: "single",
            tour_date_id: tourDate.id,
            color,
          })
          .select()
          .single();

        if (dateJobError) throw dateJobError;

        // Create department associations for this date's job
        const dateDepartments = departments.map(department => ({
          job_id: dateJob.id,
          department
        }));

        const { error: dateDeptError } = await supabase
          .from("job_departments")
          .insert(dateDepartments);

        if (dateDeptError) throw dateDeptError;
      }

      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["tours"] });

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

          <TourDateForm
            dates={dates}
            onDateChange={handleDateChange}
            onAddDate={handleAddDate}
            onRemoveDate={handleRemoveDate}
            locations={locations}
          />

          <TourDepartmentSelector
            departments={departments}
            availableDepartments={availableDepartments}
            currentDepartment={currentDepartment}
            onDepartmentChange={handleDepartmentChange}
          />

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