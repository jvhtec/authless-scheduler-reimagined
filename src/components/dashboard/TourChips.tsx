import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, Printer } from "lucide-react";
import { useState } from "react";
import { TourDateManagementDialog } from "../tours/TourDateManagementDialog";
import { TourCard } from "../tours/TourCard";
import CreateTourDialog from "../tours/CreateTourDialog";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF } from "@/lib/pdfexport";

interface TourChipsProps {
  onTourClick: (tourId: string) => void;
}

export const TourChips = ({ onTourClick }: TourChipsProps) => {
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [isDatesDialogOpen, setIsDatesDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: tours = [] } = useQuery({
    queryKey: ["tours"],
    queryFn: async () => {
      console.log("Fetching tours...");
      const { data: toursData, error: toursError } = await supabase
        .from("tours")
        .select(`
          id,
          name,
          description,
          start_date,
          end_date,
          color,
          flex_folders_created,
          tour_dates (
            id,
            date,
            location:locations (name)
          )
        `)
        .order("created_at", { ascending: false })
        .eq("deleted", false);

      if (toursError) {
        console.error("Error fetching tours:", toursError);
        throw toursError;
      }

      console.log("Tours fetched successfully");
      return toursData;
    },
  });

  const handleManageDates = (tourId: string) => {
    setSelectedTourId(tourId);
    setIsDatesDialogOpen(true);
  };

  const handlePrint = async (tour: any) => {
    try {
      const rows = tour.tour_dates.map((td: any) => ({
        quantity: new Date(td.date).toLocaleDateString(),
        componentName: td.location?.name || "",
      }));

      const exportTable = {
        name: "Tour Dates",
        rows,
      };

      const jobDate = new Date(tour.start_date).toLocaleDateString();
      const pdfBlob = await exportToPDF(
        tour.name,
        [exportTable],
        "weight",
        tour.name,
        jobDate
      );

      const url = URL.createObjectURL(pdfBlob);
      window.open(url, "_blank");
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error",
        description: "Failed to export PDF.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Tour
        </Button>
      </div>

      <div className="space-y-4">
        {tours.map((tour: any) => (
          <div key={tour.id} className="max-w-md">
            <TourCard
              tour={tour}
              onTourClick={() => onTourClick(tour.id)}
              onManageDates={() => handleManageDates(tour.id)}
              onPrint={() => handlePrint(tour)}
            />
          </div>
        ))}
      </div>

      {selectedTourId && (
        <TourDateManagementDialog
          open={isDatesDialogOpen}
          onOpenChange={setIsDatesDialogOpen}
          tourId={selectedTourId}
          tourDates={
            tours.find((t: any) => t.id === selectedTourId)?.tour_dates || []
          }
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