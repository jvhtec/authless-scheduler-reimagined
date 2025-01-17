import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Settings, FolderPlus } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { TourManagementDialog } from "./TourManagementDialog";

interface TourCardProps {
  tour: any;
  onTourClick: (tourId: string) => void;
}

export const TourCard = ({ tour, onTourClick }: TourCardProps) => {
  const { toast } = useToast();
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

  const handleManageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsManageDialogOpen(true);
  };

  return (
    <Card 
      className="mb-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onTourClick(tour.id)}
      style={{ 
        borderColor: `${tour.color}30` || '#7E69AB30',
        backgroundColor: `${tour.color}05` || '#7E69AB05'
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-semibold">
          {tour.name}
          {tour.flex_main_folder_id && (
            <Badge variant="secondary" className="ml-2">Flex Folders Created</Badge>
          )}
        </CardTitle>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleManageClick}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2 text-sm">
          {tour.description && (
            <p className="text-muted-foreground">{tour.description}</p>
          )}
          
          {(tour.start_date || tour.end_date) && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {tour.start_date && format(new Date(tour.start_date), 'MMM d, yyyy')}
                {tour.end_date && ` - ${format(new Date(tour.end_date), 'MMM d, yyyy')}`}
              </span>
            </div>
          )}

          {tour.tour_dates?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Tour Dates</h4>
              <div className="space-y-2">
                {tour.tour_dates.map((date: any) => (
                  <div key={date.id} className="flex items-center justify-between p-2 rounded-md bg-accent/20">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(date.date), 'MMM d, yyyy')}</span>
                    </div>
                    {date.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{date.location.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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