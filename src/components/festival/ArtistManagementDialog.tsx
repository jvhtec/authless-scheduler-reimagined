import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

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
  end_time
}: ArtistManagementDialogProps) => {
  const { toast } = useToast();
  const [dates, setDates] = useState<string[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to generate dates between two Date objects (inclusive)
  const getDatesBetween = (start: Date, end: Date): string[] => {
    const dates = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current).toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  useEffect(() => {
    let isMounted = true;

    const initializeDialog = async () => {
      if (!open) return;

      try {
        setLoading(true);
        setError(null);
        console.log("ArtistManagementDialog initializing with:", {
          jobId,
          start_time,
          end_time
        });

        // Validate dates
        const startDate = new Date(start_time);
        const endDate = new Date(end_time);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error("Invalid date format received");
        }

        // Generate dates
        const computedDates = getDatesBetween(startDate, endDate);
        if (isMounted) {
          setDates(computedDates);
          console.log("Computed dates:", computedDates);
        }

        // Fetch artists
        const { data: artistsData, error: fetchError } = await supabase
          .from("festival_artists")
          .select("*")
          .eq("job_id", jobId)
          .order("date", { ascending: true });

        if (fetchError) throw fetchError;

        if (isMounted) {
          setArtists(artistsData || []);
          console.log("Fetched artists:", artistsData);
        }
      } catch (err: any) {
        console.error("Error in ArtistManagementDialog:", err);
        if (isMounted) {
          setError(err.message);
          toast({
            title: "Error",
            description: err.message,
            variant: "destructive"
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeDialog();

    return () => {
      isMounted = false;
    };
  }, [open, jobId, start_time, end_time, toast]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div className="bg-background rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Manage Festival Artists
          </h2>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-destructive p-4 rounded-md bg-destructive/10">
            {error}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <section>
                <h3 className="font-medium mb-2">Festival Dates</h3>
                {dates.length === 0 ? (
                  <p className="text-muted-foreground">No dates available.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {dates.map((date) => (
                      <div 
                        key={date}
                        className="p-2 bg-muted rounded-md"
                      >
                        {format(new Date(date), "PPP")}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="font-medium mb-2">Assigned Artists</h3>
                {artists.length === 0 ? (
                  <p className="text-muted-foreground">No artists assigned yet.</p>
                ) : (
                  <div className="space-y-2">
                    {artists.map((artist) => (
                      <div 
                        key={artist.id}
                        className="p-3 bg-muted rounded-md"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {artist.name || "Unnamed Artist"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {artist.date ? format(new Date(artist.date), "PPP") : "No date set"}
                          </span>
                        </div>
                        {artist.stage && (
                          <span className="text-sm text-muted-foreground block mt-1">
                            Stage: {artist.stage}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};