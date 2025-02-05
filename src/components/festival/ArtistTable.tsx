import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface ArtistTableProps {
  jobId: string;
}

export const ArtistTable = ({ jobId }: ArtistTableProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: artists, isLoading: artistsLoading } = useQuery({
    queryKey: ["festival-artists", jobId],
    queryFn: async () => {
      console.log("Fetching artists for job:", jobId);
      const { data, error } = await supabase
        .from("festival_artists")
        .select("*")
        .eq("job_id", jobId)
        .order("date", { ascending: true });

      if (error) {
        console.error("Error fetching festival artists:", error);
        throw error;
      }

      console.log("Fetched artists:", data);
      return data;
    },
  });

  const handleAddArtist = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("festival_artists").insert([
        {
          job_id: jobId,
          name: "New Artist",
        },
      ]);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["festival-artists"] });

      toast({
        title: "Success",
        description: "Artist added successfully",
      });
    } catch (error: any) {
      console.error("Error adding artist:", error);
      toast({
        title: "Error",
        description: "Failed to add artist: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return "-";
    return time.substring(0, 5); // Format HH:mm
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Festival Artists</h3>
        <Button onClick={handleAddArtist} disabled={isLoading}>
          <Plus className="mr-2 h-4 w-4" />
          Add Artist
        </Button>
      </div>

      {artistsLoading ? (
        <div className="text-center py-4">Loading artists...</div>
      ) : artists && artists.length > 0 ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artist Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Show Time</TableHead>
                <TableHead>Soundcheck</TableHead>
                <TableHead>Technical Setup</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {artists.map((artist) => (
                <TableRow key={artist.id}>
                  <TableCell className="font-medium">{artist.name}</TableCell>
                  <TableCell>
                    {artist.date ? format(new Date(artist.date), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell>{artist.stage || "-"}</TableCell>
                  <TableCell>
                    {formatTime(artist.show_start)} - {formatTime(artist.show_end)}
                  </TableCell>
                  <TableCell>
                    {artist.soundcheck ? (
                      <>
                        {formatTime(artist.soundcheck_start)} -{" "}
                        {formatTime(artist.soundcheck_end)}
                      </>
                    ) : (
                      "No soundcheck"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {artist.foh_console && (
                        <div>FOH: {artist.foh_console}</div>
                      )}
                      {artist.mon_console && (
                        <div>MON: {artist.mon_console}</div>
                      )}
                      {artist.wireless_quantity > 0 && (
                        <div>
                          Wireless: {artist.wireless_quantity}x {artist.wireless_model}
                        </div>
                      )}
                      {artist.iem_quantity > 0 && (
                        <div>
                          IEM: {artist.iem_quantity}x {artist.iem_model}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          No artists found. Click "Add Artist" to get started.
        </div>
      )}
    </div>
  );
};