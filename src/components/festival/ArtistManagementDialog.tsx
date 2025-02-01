import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

// Helper to generate dates between two dates (inclusive)
const getDatesBetween = (start: Date, end: Date): string[] => {
  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current).toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

interface ArtistManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  start_time: string;
  end_time: string;
}

export const ArtistManagementDialog = ({
  open,
  onOpenChange,
  jobId,
  start_time,
  end_time,
}: ArtistManagementDialogProps) => {
  const { toast } = useToast();
  const [dates, setDates] = useState<string[]>([]);
  const [artists, setArtists] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      console.log("ArtistManagementDialog opened with start_time:", start_time, "end_time:", end_time);
      const startDate = new Date(start_time);
      const endDate = new Date(end_time);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error("Invalid start_time or end_time:", start_time, end_time);
        toast({
          title: "Error",
          description: "Invalid job timing data.",
          variant: "destructive",
        });
        return;
      }

      const computedDates = getDatesBetween(startDate, endDate);
      console.log("Computed dates:", computedDates);
      setDates(computedDates);

      fetchArtists();
    }
  }, [open, start_time, end_time]);

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from("festival_artists")
        .select("*")
        .eq("job_id", jobId)
        .order("date", { ascending: true });
      if (error) throw error;
      console.log("Fetched artists:", data);
      setArtists(data || []);
    } catch (error: any) {
      console.error("Error fetching artists in ArtistManagementDialog:", error);
      toast({
        title: "Error",
        description: "Failed to fetch artists",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded p-4 w-full max-w-lg">
            <h2 className="text-xl font-semibold mb-2">
              Manage Artists for Job {jobId}
            </h2>
            <p className="mb-4">
              Job Start: {new Date(start_time).toLocaleString()} – End:{" "}
              {new Date(end_time).toLocaleString()}
            </p>
            <div className="mb-4">
              <h3 className="font-medium">Job Dates</h3>
              {dates.length === 0 ? (
                <p>No dates available.</p>
              ) : (
                <ul className="list-disc ml-5">
                  {dates.map((date) => (
                    <li key={date}>{date}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mb-4">
              <h3 className="font-medium">Assigned Artists</h3>
              {artists.length === 0 ? (
                <p>No artists assigned yet.</p>
              ) : (
                <ul className="list-disc ml-5">
                  {artists.map((artist) => (
                    <li key={artist.id}>
                      {artist.name || "Unnamed Artist"} – {artist.date}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};