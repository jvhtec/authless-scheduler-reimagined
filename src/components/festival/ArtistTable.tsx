import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ArtistTableProps {
  jobId: string;
}

export const ArtistTable = ({ jobId }: ArtistTableProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { data: artists, isLoading: artistsLoading } = useQuery({
    queryKey: ["festival-artists", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("festival_artists")
        .select("*")
        .eq("job_id", jobId)
        .order("performance_order", { ascending: true });

      if (error) {
        console.error("Error fetching festival artists:", error);
        throw error;
      }

      return data;
    },
  });

  const handleAddArtist = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("festival_artists").insert([
        {
          job_id: jobId,
          artist_name: "New Artist",
          performance_order: (artists?.length || 0) + 1,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Artist added successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add artist: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <Button onClick={handleAddArtist} disabled={isLoading}>
          <Plus className="mr-2 h-4 w-4" />
          Add Artist
        </Button>
      </div>

      {artistsLoading ? (
        <div>Loading artists...</div>
      ) : artists && artists.length > 0 ? (
        <table className="w-full">
          <thead>
            <tr>
              <th>Order</th>
              <th>Artist Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {artists.map((artist) => (
              <tr key={artist.id}>
                <td>{artist.performance_order}</td>
                <td>{artist.artist_name}</td>
                <td>
                  {/* Add edit/delete actions here */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div>No artists found</div>
      )}
    </div>
  );
};