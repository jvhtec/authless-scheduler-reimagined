import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { TourDateManagementDialog } from "../tours/TourDateManagementDialog";
import { TourManagementDialog } from "../tours/TourManagementDialog";
import { TourCard } from "../tours/TourCard";
import CreateTourDialog from "../tours/CreateTourDialog";

interface TourChipsProps {
  onTourClick: (tourId: string) => void;
}

export const TourChips = ({ onTourClick }: TourChipsProps) => {
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [selectedTour, setSelectedTour] = useState<any>(null);
  const [isDatesDialogOpen, setIsDatesDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: tours = [], isLoading } = useQuery({
    queryKey: ["tours-with-dates"],
    queryFn: async () => {
      console.log("Fetching tours and dates...");
      const { data: toursData, error: toursError } = await supabase
        .from("tours")
        .select(`
          *,
          tour_dates (
            id,
            date,
            location:locations (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (toursError) {
        console.error("Error fetching tours:", toursError);
        throw toursError;
      }

      console.log("Tours and dates fetched successfully");
      return toursData;
    }
  });

  if (isLoading) return <div>Loading tours...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tours</h2>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Tour
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tours.map((tour) => (
          <TourCard
            key={tour.id}
            tour={tour}
            onTourClick={onTourClick}
          />
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

      <CreateTourDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        currentDepartment="sound"
      />
    </div>
  );
};