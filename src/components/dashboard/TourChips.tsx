import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { TourDateManagementDialog } from "../tours/TourDateManagementDialog";
import { TourManagementDialog } from "../tours/TourManagementDialog";
import { Calendar, Settings } from "lucide-react";

interface TourChipsProps {
  onTourClick: (tourId: string) => void;
}

export const TourChips = ({ onTourClick }: TourChipsProps) => {
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [selectedTour, setSelectedTour] = useState<any>(null);
  const [isDatesDialogOpen, setIsDatesDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

  const { data: tours, isLoading } = useQuery({
    queryKey: ["tours"],
    queryFn: async () => {
      console.log("Fetching tours data...");
      
      // First get all tours with their dates
      const { data: tours, error: toursError } = await supabase
        .from("tours")
        .select(`
          id,
          name,
          description,
          created_at,
          tour_dates (
            id,
            date,
            location:locations(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (toursError) {
        console.error("Error fetching tours:", toursError);
        throw toursError;
      }

      console.log("Tours data:", tours);

      // For each tour date, get the associated jobs
      const toursWithJobs = await Promise.all(
        tours.map(async (tour) => {
          const jobPromises = tour.tour_dates.map(async (date: any) => {
            const { data: jobs, error: jobsError } = await supabase
              .from("jobs")
              .select("id, color, start_time, end_time")
              .eq("tour_date_id", date.id);

            if (jobsError) {
              console.error("Error fetching jobs for tour date:", jobsError);
              return [];
            }

            return jobs;
          });

          const allJobs = await Promise.all(jobPromises);
          const flattenedJobs = allJobs.flat();

          // Get the first job's details for the tour chip display
          const firstJob = flattenedJobs[0];

          return {
            ...tour,
            title: tour.name,
            color: firstJob?.color || '#7E69AB',
            start_time: firstJob?.start_time,
            end_time: firstJob?.end_time,
            jobs: flattenedJobs
          };
        })
      );

      // Filter out tours without jobs
      return toursWithJobs.filter(tour => tour.start_time && tour.end_time);
    },
  });

  if (isLoading) return <div>Loading tours...</div>;

  const handleViewDates = (tour: any) => {
    console.log("Opening dates dialog for tour:", tour);
    setSelectedTourId(tour.id);
    setIsDatesDialogOpen(true);
  };

  const handleManageTour = (tour: any) => {
    console.log("Opening manage dialog for tour:", tour);
    setSelectedTour(tour);
    setIsManageDialogOpen(true);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {tours?.map((tour) => (
          <div key={tour.id} className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTourClick(tour.id)}
              className={cn(
                "rounded-full border-2",
                "hover:bg-opacity-10 hover:text-foreground transition-colors"
              )}
              style={{
                borderColor: tour.color,
                color: tour.color,
                backgroundColor: `${tour.color}10`
              }}
            >
              {tour.title} ({format(new Date(tour.start_time), 'MMM yyyy')})
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleViewDates(tour)}
            >
              <Calendar className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleManageTour(tour)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {selectedTourId && (
        <TourDateManagementDialog
          open={isDatesDialogOpen}
          onOpenChange={setIsDatesDialogOpen}
          tourId={selectedTourId}
          tourDates={tours?.find(t => t.id === selectedTourId)?.tour_dates || []}
        />
      )}

      {selectedTour && (
        <TourManagementDialog
          open={isManageDialogOpen}
          onOpenChange={setIsManageDialogOpen}
          tour={selectedTour}
        />
      )}
    </>
  );
};