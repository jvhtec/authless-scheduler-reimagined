import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SimplifiedJobColorPicker } from "@/components/jobs/SimplifiedJobColorPicker";

interface CreateTourDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateTourDialog = ({ open, onOpenChange }: CreateTourDialogProps) => {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venues, setVenues] = useState("");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState("#7E69AB");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Creating tour with data:", {
      name,
      startDate,
      endDate,
      venues,
      notes,
      color
    });
    
    try {
      toast({
        title: "Success",
        description: "Tour created successfully",
      });

      onOpenChange(false);
      
      // Reset form
      setName("");
      setStartDate("");
      setEndDate("");
      setVenues("");
      setNotes("");
      setColor("#7E69AB");
    } catch (error) {
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Tour</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tour Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <SimplifiedJobColorPicker value={color} onChange={setColor} />

          <div className="space-y-2">
            <Label htmlFor="venues">Venues</Label>
            <Textarea
              id="venues"
              value={venues}
              onChange={(e) => setVenues(e.target.value)}
              placeholder="Enter venue details"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes"
            />
          </div>

          <Button type="submit" className="w-full">Create Tour</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTourDialog;