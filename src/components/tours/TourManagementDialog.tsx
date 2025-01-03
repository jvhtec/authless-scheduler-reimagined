import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { SimplifiedJobColorPicker } from "../jobs/SimplifiedJobColorPicker";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Palette, Trash2 } from "lucide-react";

interface TourManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tour: any;
}

export const TourManagementDialog = ({
  open,
  onOpenChange,
  tour,
}: TourManagementDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleColorChange = async (color: string) => {
    try {
      console.log("Updating color for tour:", tour);
      
      // Get all tour dates for this tour
      const { data: tourDates, error: tourDatesError } = await supabase
        .from("tour_dates")
        .select("id")
        .eq("tour_id", tour.id);

      if (tourDatesError) throw tourDatesError;

      if (tourDates) {
        // Update all jobs associated with these tour dates
        await supabase
          .from("jobs")
          .update({ color })
          .in("tour_date_id", tourDates.map(td => td.id));
      }

      await queryClient.invalidateQueries({ queryKey: ["tours"] });
      toast({ title: "Color updated successfully" });
    } catch (error) {
      console.error("Error updating color:", error);
      toast({
        title: "Error updating color",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTour = async () => {
    try {
      console.log("Deleting tour:", tour);

      // Get all tour dates for this tour
      const { data: tourDates, error: tourDatesError } = await supabase
        .from("tour_dates")
        .select("id")
        .eq("tour_id", tour.id);

      if (tourDatesError) throw tourDatesError;

      if (tourDates) {
        // Get all jobs associated with these tour dates
        const { data: jobs, error: jobsError } = await supabase
          .from("jobs")
          .select("id")
          .in("tour_date_id", tourDates.map(td => td.id));

        if (jobsError) throw jobsError;

        if (jobs) {
          // Delete job assignments for tour date jobs
          await supabase
            .from("job_assignments")
            .delete()
            .in("job_id", jobs.map(j => j.id));

          // Delete job departments for tour date jobs
          await supabase
            .from("job_departments")
            .delete()
            .in("job_id", jobs.map(j => j.id));

          // Delete tour date jobs
          await supabase
            .from("jobs")
            .delete()
            .in("id", jobs.map(j => j.id));
        }
      }

      // Delete tour dates
      await supabase
        .from("tour_dates")
        .delete()
        .eq("tour_id", tour.id);

      // Delete tour
      await supabase
        .from("tours")
        .delete()
        .eq("id", tour.id);

      await queryClient.invalidateQueries({ queryKey: ["tours"] });
      onOpenChange(false);
      toast({ title: "Tour deleted successfully" });
    } catch (error) {
      console.error("Error deleting tour:", error);
      toast({
        title: "Error deleting tour",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Tour</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="font-medium">Tour Color</span>
            </div>
            <SimplifiedJobColorPicker
              color={tour.color}
              onChange={handleColorChange}
            />
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Tour
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the tour
                  and all associated tour dates.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTour}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
};