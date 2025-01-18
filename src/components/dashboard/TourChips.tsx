import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { TourDateManagementDialog } from "../tours/TourDateManagementDialog";
import { TourCard } from "../tours/TourCard";
import CreateTourDialog from "../tours/CreateTourDialog";
import { useToast } from "@/hooks/use-toast";

interface TourChipsProps {
  onTourClick: (tourId: string) => void;
}

export const TourChips = ({ onTourClick }: TourChipsProps) => {
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [isDatesDialogOpen, setIsDatesDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: tours = [], isLoading } = useQuery({
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
        .order('created_at', { ascending: false });

      if (toursError) {
        console.error("Error fetching tours:", toursError);
        throw toursError;
      }

      console.log("Tours fetched successfully");
      return toursData;
    }
  });

  const handleManageDates = (tourId: string) => {
    setSelectedTourId(tourId);
    setIsDatesDialogOpen(true);
  };

  const handleCreateFlexFolders = async (tourId: string) => {
    try {
      console.log("Creating Flex folders for tour:", tourId);
      const tour = tours.find(t => t.id === tourId);
      
      if (!tour) {
        throw new Error("Tour not found");
      }

      const { data, error } = await supabase.functions.invoke('create-flex-folders', {
        body: { 
          tourId: tour.id,
          tourName: tour.name,
          startDate: tour.start_date,
          endDate: tour.end_date,
          description: tour.description || '',
          // Include hardcoded parameters
          departmentFolders: ['sound', 'lights', 'video', 'production', 'personnel'],
          mainFolderPrefix: 'TOUR',
          departmentPrefixes: {
            sound: 'SND',
            lights: 'LTS',
            video: 'VID',
            production: 'PRD',
            personnel: 'PER'
          }
        }
      });

      if (error) {
        console.error("Error creating Flex folders:", error);
        throw error;
      }

      console.log("Flex folders created successfully:", data);
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
        {tours.map((tour) => (
          <TourCard
            key={tour.id}
            tour={tour}
            onTourClick={onTourClick}
            onManageDates={handleManageDates}
            onCreateFlexFolders={handleCreateFlexFolders}
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

      <CreateTourDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        currentDepartment="sound"
      />
    </div>
  );
};