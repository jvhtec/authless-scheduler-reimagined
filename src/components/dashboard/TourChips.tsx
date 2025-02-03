import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Edit2, Printer } from "lucide-react";
import { useState } from "react";
import { TourManagementDialog } from "./TourManagementDialog";
import { exportTourDatesToPDF } from "@/utils/pdfExport";
import { supabase } from "@/lib/supabase";

interface TourCardProps {
  tour: any;
  onTourClick: (tourId: string) => void;
  onManageDates: (tourId: string) => void;
}

export const TourCard = ({ tour, onTourClick, onManageDates }: TourCardProps) => {
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrintPDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPrinting(true);
    console.log(`Printing PDF for tour id: ${tour.id}`);
    
    // Retrieve all dates and locations for the tour from the "tour_dates" table.
    const { data, error } = await supabase
      .from("tour_dates")
      .select("*")
      .eq("tour_id", tour.id);

    if (error) {
      console.error("Error fetching tour dates:", error);
      setIsPrinting(false);
      return;
    }
    if (!data || data.length === 0) {
      console.warn("No tour dates found for this tour.");
      setIsPrinting(false);
      return;
    }
    try {
      const blob = await exportTourDatesToPDF(tour.name, data);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${tour.name}-tour-dates.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      console.log("PDF export complete.");
    } catch (err) {
      console.error("Error exporting PDF:", err);
    }
    setIsPrinting(false);
  };

  if (!tour) return null;

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer m-2 max-w-xs" // max-width only, not height-limited
      onClick={() => onTourClick(tour.id)}
      style={{
        borderColor: tour.color ? `${tour.color}30` : "#7E69AB30",
        backgroundColor: tour.color ? `${tour.color}05` : "#7E69AB05",
      }}
    >
      <CardHeader className="flex flex-col items-start pb-2">
        <CardTitle className="text-xl font-semibold">
          {tour.name}
        </CardTitle>
        {tour.flex_main_folder_id && (
          <Badge variant="secondary" className="mt-1">
            Flex Folders Created
          </Badge>
        )}
      </CardHeader>

      <CardContent className="relative">
        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onManageDates(tour.id);
            }}
            title="Manage Dates"
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsManageDialogOpen(true);
            }}
            title="Edit Tour"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrintPDF}
            title="Print to PDF"
            disabled={isPrinting}
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
        {tour.description && (
          <p className="text-muted-foreground mt-2">
            {tour.description}
          </p>
        )}
      </CardContent>

      {isManageDialogOpen && (
        <TourManagementDialog
          open={isManageDialogOpen}
          onOpenChange={setIsManageDialogOpen}
          tour={tour}
        />
      )}
    </Card>
  );
};