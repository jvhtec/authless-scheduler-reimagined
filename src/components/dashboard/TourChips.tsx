import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Edit2, Printer } from "lucide-react";
import { TourManagementDialog } from "./TourManagementDialog";
import { supabase } from "@/lib/supabaseClient";
import { exportToPDF } from "@/lib/pdfexport";

interface TourCardProps {
  tour: any;
  onTourClick: (tourId: string) => void;
  onManageDates: (tourId: string) => void;
  onTourUpdated?: (tour: any) => void;
}

export const TourCard = ({
  tour,
  onTourClick,
  onManageDates,
  onTourUpdated,
}: TourCardProps) => {
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

  // This function retrieves the tour dates from Supabase and calls exportToPDF
  const handlePrintPDF = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    // Retrieve all dates and locations from the tour_dates table for the given tour id.
    const { data: tourDates, error } = await supabase
      .from("tour_dates")
      .select("date, location")
      .eq("tour_id", tour.id);

    if (error) {
      console.error("Error retrieving tour dates:", error);
      return;
    }

    // Prepare the table data for PDF export.
    // The table data is structured to match the new "tour" export type.
    const tableData = {
      name: "Tour Dates & Locations",
      rows: tourDates.map((row: any) => ({
        date: row.date,
        location: row.location,
      })),
    };

    try {
      // Use the tour name as jobName and the first tour date as jobDate (if available)
      const jobDate =
        tourDates && tourDates.length > 0
          ? new Date(tourDates[0].date).toLocaleDateString("en-GB")
          : new Date().toLocaleDateString("en-GB");

      const blob = await exportToPDF(
        tour.name,   // projectName
        [tableData], // tables (with our tour dates table as the only element)
        "tour",      // report type – new type for tour dates
        tour.name,   // jobName
        jobDate      // jobDate
      );

      // Create a temporary URL for the blob and trigger a download.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tour.name.replace(/\s+/g, "_")}_TourDates.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting PDF:", err);
    }
  };

  return (
    <div className="inline-block w-fit m-2">
      <Card
        className="relative hover:shadow-md transition-shadow cursor-pointer p-3"
        onClick={() => onTourClick(tour.id)}
        style={{
          borderColor: tour.color ? `${tour.color}30` : "#7E69AB30",
          backgroundColor: tour.color ? `${tour.color}05` : "#7E69AB05",
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            {tour.name}
            {tour.flex_main_folder_id && (
              <Badge variant="secondary">Flex Folders Created</Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="relative">
          {/* Action buttons positioned at the top-right of the card */}
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
              title="Print Tour Dates to PDF"
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
          {tour.description && (
            <p className="text-muted-foreground mt-8">{tour.description}</p>
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
    </div>
  );
};