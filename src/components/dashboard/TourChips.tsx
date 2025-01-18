import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, FolderPlus, Calendar, Edit2, Palette } from "lucide-react";
import { useState } from "react";
import { TourDateManagementDialog } from "../tours/TourDateManagementDialog";
import { TourCard } from "../tours/TourCard";
import CreateTourDialog from "../tours/CreateTourDialog";
import { TourManagementDialog } from "../tours/TourManagementDialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TourChipsProps {
  onTourClick: (tourId: string) => void;
}

export const TourChips = ({ onTourClick }: TourChipsProps) => {
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [isDatesDialogOpen, setIsDatesDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

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

  const handleManageDates = (tourId: string) => {
    setSelectedTourId(tourId);
    setIsDatesDialogOpen(true);
  };

  const handleEditTour = (tourId: string) => {
    setSelectedTourId(tourId);
    setIsEditDialogOpen(true);
  };

  const handleCreateFlexFolders = async (tourId: string) => {
    try {
      const { data: tour, error: tourError } = await supabase
        .from('tours')
        .select('*')
        .eq('id', tourId)
        .single();

      if (tourError) throw tourError;

      const response = await fetch('/api/create-flex-folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tourId: tour.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Flex folders');
      }

      toast({
        title: "Success",
        description: "Flex folders created successfully",
      });

    } catch (error) {
      console.error('Error creating Flex folders:', error);
      toast({
        title: "Error",
        description: "Failed to create Flex folders",
        variant: "destructive",
      });
    }
  };

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
        {tours.map((tour) => {
          const dates = tour.tour_dates || [];
          const sortedDates = [...dates].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const startDate = sortedDates[0]?.date;
          const endDate = sortedDates[sortedDates.length - 1]?.date;
          
          return (
            <div key={tour.id} className="relative">
              <TourCard
                tour={tour}
                onTourClick={onTourClick}
              />
              <div className="absolute top-2 right-2 flex gap-2">
                {startDate && endDate && (
                  <div className="bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded-md text-xs flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(startDate), "MMM d")} - {format(new Date(endDate), "MMM d, yyyy")}</span>
                  </div>
                )}
                <div className="flex gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleManageDates(tour.id);
                    }}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTour(tour.id);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateFlexFolders(tour.id);
                    }}
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedTourId && (
        <>
          <TourDateManagementDialog
            open={isDatesDialogOpen}
            onOpenChange={setIsDatesDialogOpen}
            tourId={selectedTourId}
            tourDates={tours.find(t => t.id === selectedTourId)?.tour_dates || []}
          />
          <TourManagementDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            tour={tours.find(t => t.id === selectedTourId)}
          />
        </>
      )}

      <CreateTourDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        currentDepartment="sound"
      />
    </div>
  );
};