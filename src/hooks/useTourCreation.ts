import { useState } from "react";
import { Department } from "@/types/department";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

export const useTourCreation = (
  currentDepartment: Department,
  onSuccess: () => void
) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dates, setDates] = useState<{ date: string; location: string }[]>([
    { date: "", location: "" },
  ]);
  const [color, setColor] = useState("#7E69AB");
  const [departments, setDepartments] = useState<Department[]>([currentDepartment]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const createTourWithDates = async () => {
    console.log("Starting tour creation process...");
    const validDates = dates.filter(date => date.date);
    
    if (validDates.length === 0) {
      throw new Error("At least one valid date is required");
    }

    // Sort dates chronologically
    validDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    try {
      // Create the tour
      console.log("Creating tour with title:", title);
      const { data: tour, error: tourError } = await supabase
        .from("tours")
        .insert({
          name: title,
          description
        })
        .select()
        .maybeSingle();

      if (tourError) {
        console.error("Error creating tour:", tourError);
        throw tourError;
      }

      if (!tour) {
        throw new Error("Failed to create tour");
      }

      console.log("Tour created successfully:", tour);

      // Process each tour date
      for (const dateInfo of validDates) {
        console.log("Processing date:", dateInfo);
        
        // First get or create location
        const { data: locationData, error: locationError } = await supabase
          .from("locations")
          .insert({ name: dateInfo.location })
          .select()
          .maybeSingle();

        if (locationError) {
          console.error("Error with location:", locationError);
          throw locationError;
        }

        const location = locationData || { id: null };
        
        // Create tour date entry
        console.log("Creating tour date with location:", location);
        const { data: tourDate, error: tourDateError } = await supabase
          .from("tour_dates")
          .insert({
            tour_id: tour.id,
            date: dateInfo.date,
            location_id: location.id
          })
          .select()
          .maybeSingle();

        if (tourDateError) {
          console.error("Error creating tour date:", tourDateError);
          throw tourDateError;
        }

        if (!tourDate) {
          throw new Error("Failed to create tour date");
        }

        // Create job for this tour date
        console.log("Creating job for tour date:", tourDate);
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
          .maybeSingle();

        if (dateJobError) {
          console.error("Error creating job:", dateJobError);
          throw dateJobError;
        }

        if (!dateJob) {
          throw new Error("Failed to create job for tour date");
        }

        // Create department associations for this date's job
        console.log("Creating department associations for job:", dateJob);
        const dateDepartments = departments.map(department => ({
          job_id: dateJob.id,
          department
        }));

        const { error: dateDeptError } = await supabase
          .from("job_departments")
          .insert(dateDepartments);

        if (dateDeptError) {
          console.error("Error creating job departments:", dateDeptError);
          throw dateDeptError;
        }
      }

      return tour;
    } catch (error) {
      console.error("Error in createTourWithDates:", error);
      throw error;
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
      console.log("Starting tour creation...");
      await createTourWithDates();
      console.log("Tour created successfully");

      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["tours"] });

      toast({
        title: "Success",
        description: "Tour created successfully",
      });

      onSuccess();
      
      // Reset form
      setTitle("");
      setDescription("");
      setDates([{ date: "", location: "" }]);
      setColor("#7E69AB");
      setDepartments([currentDepartment]);
    } catch (error: any) {
      console.error("Error creating tour:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create tour",
        variant: "destructive",
      });
    }
  };

  return {
    title,
    setTitle,
    description,
    setDescription,
    dates,
    color,
    setColor,
    departments,
    handleAddDate,
    handleRemoveDate,
    handleDateChange,
    handleDepartmentChange,
    handleSubmit,
  };
};