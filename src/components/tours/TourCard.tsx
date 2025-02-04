import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Settings } from "lucide-react";
import { format } from "date-fns";

interface TourCardProps {
  tour: any;
  onTourClick: (tourId: string) => void;
  onManageDates: () => void;
  onPrint: () => void;
}

export const TourCard = ({ tour, onTourClick, onManageDates, onPrint }: TourCardProps) => {
  return (
    <Card 
      className={`w-full transition-all hover:shadow-lg cursor-pointer ${
        tour.color ? `border-l-4 border-l-[${tour.color}]` : ''
      }`}
      onClick={() => onTourClick(tour.id)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{tour.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onPrint();
              }}
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onManageDates();
              }}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {tour.start_date && tour.end_date
              ? `${format(new Date(tour.start_date), 'PP')} - ${format(
                  new Date(tour.end_date),
                  'PP'
                )}`
              : 'Dates not set'}
          </span>
        </div>
        {tour.description && (
          <p className="mt-2 text-sm text-muted-foreground">{tour.description}</p>
        )}
      </CardContent>
    </Card>
  );
};