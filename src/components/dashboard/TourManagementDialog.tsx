import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTourManagement } from "@/components/tours/hooks/useTourManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface TourManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tour: any;
}

export function TourManagementDialog({ open, onOpenChange, tour }: TourManagementDialogProps) {
  const [name, setName] = useState(tour.name);
  const { handleNameChange, handleColorChange, handleDelete } = useTourManagement(tour, () => onOpenChange(false));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Tour</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Tour Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleNameChange(name)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="color" className="text-sm font-medium">
              Tour Color
            </label>
            <Input
              id="color"
              type="color"
              value={tour.color || "#7E69AB"}
              onChange={(e) => handleColorChange(e.target.value)}
            />
          </div>
          <div className="pt-4">
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="w-full"
            >
              Delete Tour
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}