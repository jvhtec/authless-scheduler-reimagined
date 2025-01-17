import { useState } from "react";
import { Department } from "@/types/department";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useTourDates } from "./useTourDates";
import { useTourDepartments } from "./useTourDepartments";
import { useTourCreationMutation } from "./useTourCreationMutation";

export const useTourCreation = (
  currentDepartment: Department,
  onSuccess: () => void
) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#7E69AB");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  const { dates, handleAddDate, handleRemoveDate, handleDateChange } = useTourDates();
  const { departments, handleDepartmentChange } = useTourDepartments(currentDepartment);
  const { createTourWithDates } = useTourCreationMutation();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    // If end date is before new start date, reset it
    if (date && endDate && endDate < date) {
      setEndDate(undefined);
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
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

    // Only validate dates if they exist
    if (dates.length > 0 && !dates.every(date => date.date)) {
      toast({
        title: "Error",
        description: "Please select a date for all tour dates",
        variant: "destructive",
      });
      return;
    }

    // Validate that end date is not before start date if both are set
    if (startDate && endDate && endDate < startDate) {
      toast({
        title: "Error",
        description: "End date cannot be before start date",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Creating tour...");
      await createTourWithDates({
        title,
        description,
        dates,
        color,
        departments,
        startDate: startDate?.toISOString().split('T')[0],
        endDate: endDate?.toISOString().split('T')[0],
      });
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
      setColor("#7E69AB");
      setStartDate(undefined);
      setEndDate(undefined);
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
    startDate,
    endDate,
    handleStartDateChange,
    handleEndDateChange,
    handleAddDate,
    handleRemoveDate,
    handleDateChange,
    handleDepartmentChange,
    handleSubmit,
  };
};