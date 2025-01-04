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

      if (tourDatesError) {
        console.error("Error fetching tour dates:", tourDatesError);
        throw tourDatesError;
      }

      console.log("Found tour dates:", tourDates);

      if (tourDates && tourDates.length > 0) {
        // Update all jobs associated with these tour dates
        const { error: jobsError } = await supabase
          .from("jobs")
          .update({ color })
          .in("tour_date_id", tourDates.map(td => td.id));

        if (jobsError) {
          console.error("Error updating jobs colors:", jobsError);
          throw jobsError;
        }
      }

      // Also update the main tour job if it exists
      const { error: mainJobError } = await supabase
        .from("jobs")
        .update({ color })
        .eq("title", tour.name)
        .eq("job_type", "tour");

      if (mainJobError) {
        console.error("Error updating main tour job color:", mainJobError);
        throw mainJobError;
      }

      await queryClient.invalidateQueries({ queryKey: ["tours-with-dates"] });
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      
      toast({ title: "Color updated successfully" });
    } catch (error: any) {
      console.error("Error updating color:", error);
      toast({
        title: "Error updating color",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTour = async () => {
    try {
      console.log("Starting tour deletion process for tour:", tour.id);

      // Get all tour dates for this tour
      const { data: tourDates, error: tourDatesError } = await supabase
        .from("tour_dates")
        .select("id")
        .eq("tour_id", tour.id);

      if (tourDatesError) {
        console.error("Error fetching tour dates:", tourDatesError);
        throw tourDatesError;
      }

      console.log("Found tour dates:", tourDates);

      if (tourDates && tourDates.length > 0) {
        const tourDateIds = tourDates.map(td => td.id);

        // Get all jobs associated with these tour dates
        const { data: jobs, error: jobsError } = await supabase
          .from("jobs")
          .select("id")
          .in("tour_date_id", tourDateIds);

        if (jobsError) {
          console.error("Error fetching jobs:", jobsError);
          throw jobsError;
        }

        console.log("Found jobs:", jobs);

        if (jobs && jobs.length > 0) {
          const jobIds = jobs.map(j => j.id);

          // Delete job assignments
          const { error: assignmentsError } = await supabase
            .from("job_assignments")
            .delete()
            .in("job_id", jobIds);

          if (assignmentsError) {
            console.error("Error deleting job assignments:", assignmentsError);
            throw assignmentsError;
          }

          // Delete job departments
          const { error: departmentsError } = await supabase
            .from("job_departments")
            .delete()
            .in("job_id", jobIds);

          if (departmentsError) {
            console.error("Error deleting job departments:", departmentsError);
            throw departmentsError;
          }

          // Delete jobs
          const { error: jobsDeleteError } = await supabase
            .from("jobs")
            .delete()
            .in("id", jobIds);

          if (jobsDeleteError) {
            console.error("Error deleting jobs:", jobsDeleteError);
            throw jobsDeleteError;
          }
        }

        // Delete tour dates
        const { error: tourDatesDeleteError } = await supabase
          .from("tour_dates")
          .delete()
          .eq("tour_id", tour.id);

        if (tourDatesDeleteError) {
          console.error("Error deleting tour dates:", tourDatesDeleteError);
          throw tourDatesDeleteError;
        }
      }

      // Finally delete the tour
      const { error: tourDeleteError } = await supabase
        .from("tours")
        .delete()
        .eq("id", tour.id);

      if (tourDeleteError) {
        console.error("Error deleting tour:", tourDeleteError);
        throw tourDeleteError;
      }

      console.log("Tour deletion completed successfully");
      await queryClient.invalidateQueries({ queryKey: ["tours-with-dates"] });
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      onOpenChange(false);
      toast({ title: "Tour deleted successfully" });
    } catch (error: any) {
      console.error("Error in deletion process:", error);
      toast({
        title: "Error deleting tour",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Tour: {tour.name}</DialogTitle>
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
                  and all associated tour dates and jobs.
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