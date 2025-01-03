import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, MapPin, Plus, Trash2 } from "lucide-react";

interface TourDateManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourId: string;
  tourDates: any[];
}

export const TourDateManagementDialog = ({
  open,
  onOpenChange,
  tourId,
  tourDates,
}: TourDateManagementDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAddDate = async (date: string, location: string) => {
    try {
      // First get or create location
      const { data: existingLocation } = await supabase
        .from("locations")
        .select("id")
        .eq("name", location)
        .single();

      let locationId = existingLocation?.id;

      if (!locationId) {
        const { data: newLocation } = await supabase
          .from("locations")
          .insert({ name: location })
          .select()
          .single();
        locationId = newLocation?.id;
      }

      // Create tour date
      await supabase
        .from("tour_dates")
        .insert({
          tour_id: tourId,
          date,
          location_id: locationId,
        });

      await queryClient.invalidateQueries({ queryKey: ["tours"] });
      toast({ title: "Date added successfully" });
    } catch (error) {
      console.error("Error adding date:", error);
      toast({
        title: "Error adding date",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDate = async (dateId: string) => {
    try {
      await supabase
        .from("tour_dates")
        .delete()
        .eq("id", dateId);

      await queryClient.invalidateQueries({ queryKey: ["tours"] });
      toast({ title: "Date deleted successfully" });
    } catch (error) {
      console.error("Error deleting date:", error);
      toast({
        title: "Error deleting date",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Tour Dates</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-4">
            {tourDates.map((date) => (
              <div
                key={date.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(date.date), "MMM d, yyyy")}</span>
                  </div>
                  {date.location?.name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{date.location.name}</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteDate(date.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddDate(
                formData.get("date") as string,
                formData.get("location") as string
              );
              (e.target as HTMLFormElement).reset();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                name="date"
                required
              />
              <Input
                type="text"
                name="location"
                placeholder="Location"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Date
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};