import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface ArtistTableProps {
  jobId: string;
}

export const ArtistTable = ({ jobId }: ArtistTableProps) => {
  const { data: artists, isLoading } = useQuery({
    queryKey: ["festival-artists", jobId],
    queryFn: async () => {
      console.log("Fetching artists for job:", jobId);
      const { data, error } = await supabase
        .from("festival_artists")
        .select("*")
        .eq("job_id", jobId)
        .order("date", { ascending: true });

      if (error) {
        console.error("Error fetching artists:", error);
        throw error;
      }

      console.log("Fetched artists:", data);
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading artists...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button>Add Artist</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {artists?.map((artist) => (
            <TableRow key={artist.id}>
              <TableCell>{artist.name}</TableCell>
              <TableCell>
                {artist.date ? format(new Date(artist.date), "PPP") : "No date set"}
              </TableCell>
              <TableCell>
                <Select value={artist.stage || "unassigned"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    <SelectItem value="main">Main Stage</SelectItem>
                    <SelectItem value="second">Second Stage</SelectItem>
                    <SelectItem value="third">Third Stage</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select value={artist.status || "pending"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};