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
    queryKey: ["tours", new Date().getFullYear()],
    queryFn: async () => {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
      const endOfYear = new Date(new Date().getFullYear(), 11, 31).toISOString();
      
      // First get all tours
      const { data: tours, error: toursError } = await supabase
        .from("tours")
        .select(`
          id,
          name,
          description
        `);

      if (toursError) throw toursError;

      // Then get all tour dates for these tours
      const { data: tourDates, error: datesError } = await supabase
        .from("tour_dates")
        .select(`
          id,
          date,
          tour_id,
          location:locations(name)
        `)
        .in('tour_id', tours.map(t => t.id))
        .order('date');

      if (datesError) throw datesError;

      // Finally get the jobs associated with these tour dates
      const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select(`
          id,
          title,
          start_time,
          end_time,
          color,
          tour_date_id
        `)
        .eq('job_type', 'tour')
        .gte('start_time', startOfYear)
        .lte('end_time', endOfYear)
        .order('start_time');

      if (jobsError) throw jobsError;

      // Combine the data
      return tours.map(tour => {
        const tourDatesForTour = tourDates.filter(date => date.tour_id === tour.id);
        const job = jobs.find(job => 
          tourDatesForTour.some(date => date.id === job.tour_date_id)
        );

        return {
          ...tour,
          title: tour.name,
          color: job?.color || '#7E69AB',
          start_time: job?.start_time,
          end_time: job?.end_time,
          dates: tourDatesForTour
        };
      }).filter(tour => tour.start_time && tour.end_time); // Only return tours with jobs
    },
  });

  if (isLoading) return <div>Loading tours...</div>;

  const handleViewDates = (tour: any) => {
    setSelectedTourId(tour.id);
    setIsDatesDialogOpen(true);
  };

  const handleManageTour = (tour: any) => {
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
          tourDates={tours?.find(t => t.id === selectedTourId)?.dates || []}
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