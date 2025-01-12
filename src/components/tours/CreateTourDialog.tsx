import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Department } from "@/types/department";
import { TourFormFields } from "./TourFormFields";
import { useTourCreation } from "./useTourCreation";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface CreateTourDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDepartment: Department;
}

export const CreateTourDialog = ({
  open,
  onOpenChange,
  currentDepartment,
}: CreateTourDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const availableDepartments: Department[] = ["sound", "lights", "video"];

  const {
    title,
    setTitle,
    description,
    setDescription,
    color,
    setColor,
    departments,
    dates,
    handleAddDate,
    handleRemoveDate,
    handleDateChange,
    handleDepartmentChange,
    handleSubmit,
  } = useTourCreation(currentDepartment, () => onOpenChange(false));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Tour</DialogTitle>
          <DialogDescription>Add a new tour with dates and locations.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TourFormFields
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            dates={dates}
            onDateChange={handleDateChange}
            onAddDate={handleAddDate}
            onRemoveDate={handleRemoveDate}
            color={color}
            setColor={setColor}
            departments={departments}
            availableDepartments={availableDepartments}
            currentDepartment={currentDepartment}
            onDepartmentChange={handleDepartmentChange}
          />
          <Button type="submit" className="w-full">
            Create Tour
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};