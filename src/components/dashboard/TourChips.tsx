import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, FolderPlus } from "lucide-react";
import { useState } from "react";
import { TourManagementDialog } from "../tours/TourManagementDialog";
import { TourCard } from "../tours/TourCard";
import CreateTourDialog from "../tours/CreateTourDialog";
import { useToast } from "@/hooks/use-toast";

interface TourChipsProps {
  onTourClick: (tourId: string) => void;
}

export const TourChips = ({ onTourClick }: TourChipsProps) => {
  const [selectedTour, setSelectedTour] = useState<any>(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: tours = [], isLoading } = useQuery({
    queryKey: ["tours"],
    queryFn: async () => {
      console.log("Fetching tours...");
      const { data: toursData, error: toursError } = await supabase
        .from("tours")
        .select("*")
        .order('created_at', { ascending: false });

      if (toursError) {
        console.error("Error fetching tours:", toursError);
        throw toursError;
      }

      console.log("Tours fetched successfully");
      return toursData;
    }
  });

  const handleCreateFlexFolders = async (tourId: string) => {
    try {
      const { data: tour, error: tourError } = await supabase
        .from('tours')
        .select('*')
        .eq('id', tourId)
        .single();

      if (tourError) throw tourError;

      // Call the Edge Function to create Flex folders
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
        {tours.map((tour) => (
          <div key={tour.id} className="relative">
            <TourCard
              tour={tour}
              onTourClick={onTourClick}
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateFlexFolders(tour.id);
                }}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Flex Folders
              </Button>
            </div>
          </div>
        ))}
      </div>

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