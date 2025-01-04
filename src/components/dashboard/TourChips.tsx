import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { TourDateManagementDialog } from "../tours/TourDateManagementDialog";
import { TourManagementDialog } from "../tours/TourManagementDialog";
import { Calendar, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TourChipsProps {
  onTourClick: (tourId: string) => void;
}

export const TourChips = ({ onTourClick }: TourChipsProps) => {
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [selectedTour, setSelectedTour] = useState<any>(null);
  const [isDatesDialogOpen, setIsDatesDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: tours = [], isLoading } = useQuery({
    queryKey: ["tours"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tours")
        .select("id, name, description, created_at")
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error fetching tours",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      // Fetch tour dates and jobs in a separate query
      const { data: toursWithDates, error: datesError } = await supabase
        .from("tour_dates")
        .select(`
          tour_id,
          date,
          location:locations(name),
          jobs(id, color)
        `);

      if (datesError) {
        toast({
          title: "Error fetching tour dates",
          description: datesError.message,
          variant: "destructive",
        });
        throw datesError;
      }

      // Map the dates and jobs to their respective tours
      return data.map(tour => {
        const tourDates = toursWithDates?.filter(td => td.tour_id === tour.id) || [];
        return {
          ...tour,
          title: tour.name,
          tour_dates: tourDates,
          color: tourDates[0]?.jobs?.[0]?.color || '#7E69AB',
        };
      });
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleViewDates = (tour: any) => {
    setSelectedTourId(tour.id);
    setIsDatesDialogOpen(true);
  };

  const handleManageTour = (tour: any) => {
    setSelectedTour(tour);
    setIsManageDialogOpen(true);
  };

  if (isLoading) return <div>Loading tours...</div>;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {tours.map((tour) => (
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
              {tour.title}
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
          tourDates={tours.find(t => t.id === selectedTourId)?.tour_dates || []}
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