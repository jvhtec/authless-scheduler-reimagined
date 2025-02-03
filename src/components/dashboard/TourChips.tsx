import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, Printer } from "lucide-react";
import { useState } from "react";
import { TourDateManagementDialog } from "../tours/TourDateManagementDialog";
import { TourCard } from "../tours/TourCard";
import CreateTourDialog from "../tours/CreateTourDialog";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF } from "@/lib/pdfexport"; // Adjust the path if needed

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
        .eq("deleted", false); // filter out deleted tours

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
      // Build an export table using the tour_dates.
      // Here we assume each row's "quantity" is the formatted date
      // and "componentName" holds the location name.
      const rows = tour.tour_dates.map((td: any) => ({
        quantity: new Date(td.date).toLocaleDateString(),
        componentName: td.location?.name || "",
      }));

      const exportTable = {
        name: "Tour Dates",
        rows,
      };

      // Build a date span string from the tour start and end dates.
      const start = new Date(tour.start_date).toLocaleDateString();
      const end = new Date(tour.end_date).toLocaleDateString();
      const dateSpan = `${start} - ${end}`;

      // Call exportToPDF passing an extra options parameter for tour reports.
      const pdfBlob = await exportToPDF(
        tour.name,    // projectName (will be used as header)
        [exportTable],
        "weight",     // type (this value is ignored when isTourReport is true)
        tour.name,    // jobName (ignored in tour report)
        dateSpan,     // jobDate (will be replaced by dateSpan in header)
        undefined,    // summaryRows
        undefined,    // powerSummary
        undefined,    // safetyMargin
        { isTourReport: true, dateSpan } // extra options for tour reports
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
          // Wrap each TourCard in a container with a reduced max-width.
          <div key={tour.id} className="max-w-md">
            <TourCard
              tour={tour}
              onTourClick={() => onTourClick(tour.id)}
              onManageDates={() => handleManageDates(tour.id)}
              // Replace the create-flex-folders action with a print action.
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
