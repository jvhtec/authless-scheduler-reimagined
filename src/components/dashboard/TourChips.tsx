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

interface Tour {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  tour_dates: Array<{
    id: string;
    date: string;
    location: {
      name: string;
    } | null;
    jobs: Array<{
      id: string;
      color: string;
    }>;
  }>;
}

export const TourChips = ({ onTourClick }: TourChipsProps) => {
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [isDatesDialogOpen, setIsDatesDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: tours, isLoading } = useQuery({
    queryKey: ["tours"],
    queryFn: async () => {
      console.log("Fetching tours data...");
      
      const { data, error } = await supabase
        .from("tours")
        .select(`
          id,
          name,
          description,
          created_at,
          tour_dates (
            id,
            date,
            location:locations (
              name
            ),
            jobs (
              id,
              color
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching tours:", error);
        toast({
          title: "Error fetching tours",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      console.log("Tours data:", data);
      return data as Tour[];
    },
  });

  const handleViewDates = (tour: Tour) => {
    console.log("Opening dates dialog for tour:", tour);
    setSelectedTourId(tour.id);
    setIsDatesDialogOpen(true);
  };

  const handleManageTour = (tour: Tour) => {
    console.log("Opening manage dialog for tour:", tour);
    setSelectedTour(tour);
    setIsManageDialogOpen(true);
  };

  if (isLoading) return <div>Loading tours...</div>;

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
                borderColor: tour.tour_dates?.[0]?.jobs?.[0]?.color || '#7E69AB',
                color: tour.tour_dates?.[0]?.jobs?.[0]?.color || '#7E69AB',
                backgroundColor: `${tour.tour_dates?.[0]?.jobs?.[0]?.color || '#7E69AB'}10`
              }}
            >
              {tour.name}
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