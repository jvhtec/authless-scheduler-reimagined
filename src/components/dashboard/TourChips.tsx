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

      const tourIds = jobs.map(job => job.id);

      const { data: tourDates, error: datesError } = await supabase
        .from("tour_dates")
        .select(`
          id,
          date,
          tour_id,
          location:locations(name)
        `)
        .in('tour_id', tourIds)
        .order('date');

      if (datesError) throw datesError;

      return jobs.map(job => ({
        ...job,
        dates: tourDates.filter(date => date.tour_id === job.id)
      }));
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