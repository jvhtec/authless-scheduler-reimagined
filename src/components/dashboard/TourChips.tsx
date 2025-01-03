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
      return tours?.map(tour => ({
        ...tour,
        title: tour.name,
        color: '#7E69AB', // Default color for consistency
      })) || [];
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