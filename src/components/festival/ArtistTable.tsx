import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit2, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ArtistTableProps {
  artists: any[];
  isLoading: boolean;
  onEditArtist: (artist: any) => void;
}

export const ArtistTable = ({ artists, isLoading, onEditArtist }: ArtistTableProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!artists.length) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        No artists added yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Artist</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Show Time</TableHead>
          <TableHead>Soundcheck</TableHead>
          <TableHead>Technical Setup</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {artists.map((artist) => (
          <TableRow key={artist.id}>
            <TableCell className="font-medium">{artist.name}</TableCell>
            <TableCell>{artist.stage}</TableCell>
            <TableCell>
              {artist.show_start && format(new Date(`2000-01-01T${artist.show_start}`), 'HH:mm')} - 
              {artist.show_end && format(new Date(`2000-01-01T${artist.show_end}`), 'HH:mm')}
            </TableCell>
            <TableCell>
              {artist.soundcheck && (
                <>
                  {artist.soundcheck_start && format(new Date(`2000-01-01T${artist.soundcheck_start}`), 'HH:mm')} - 
                  {artist.soundcheck_end && format(new Date(`2000-01-01T${artist.soundcheck_end}`), 'HH:mm')}
                </>
              )}
            </TableCell>
            <TableCell>
              <div className="flex flex-col text-sm">
                <span>FOH: {artist.foh_console}</span>
                <span>MON: {artist.mon_console}</span>
              </div>
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditArtist(artist)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};