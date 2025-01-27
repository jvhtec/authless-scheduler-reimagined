import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface Artist {
  id?: string;
  job_id: string;
  name: string;
  show_start: string;
  show_end: string;
  soundcheck: boolean;
  soundcheck_start: string;
  soundcheck_end: string;
  foh_console: string;
  foh_tech: boolean;
  mon_console: string;
  mon_tech: boolean;
  wireless_model: string;
  wireless_quantity: number;
  wireless_band: string;
  iem_model: string;
  iem_quantity: number;
  iem_band: string;
  monitors_enabled: boolean;
  monitors_quantity: number;
  extras_sf: boolean;
  extras_df: boolean;
  extras_djbooth: boolean;
  extras_wired: string;
  notes: string;
}

interface ArtistTableProps {
  jobId: string;
}

export const ArtistTable = ({ jobId }: ArtistTableProps) => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const { toast } = useToast();
  const consoleModels = ["SD5", "SD10", "CL5", "PM5D"];

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const { data, error } = await supabase
          .from("festival_artists")
          .select("*")
          .eq("job_id", jobId);
        if (error) throw error;
        setArtists(data || []);
      } catch (error) {
        console.error("Error fetching artists:", error.message);
      }
    };

    fetchArtists();
  }, [jobId]);

  const addArtist = async () => {
    const newArtist: Omit<Artist, "id"> = {
      job_id: jobId,
      name: "",
      show_start: "",
      show_end: "",
      soundcheck: false,
      soundcheck_start: "",
      soundcheck_end: "",
      foh_console: "",
      foh_tech: false,
      mon_console: "",
      mon_tech: false,
      wireless_model: "",
      wireless_quantity: 0,
      wireless_band: "",
      iem_model: "",
      iem_quantity: 0,
      iem_band: "",
      monitors_enabled: false,
      monitors_quantity: 0,
      extras_sf: false,
      extras_df: false,
      extras_djbooth: false,
      extras_wired: "",
      notes: "",
    };

    try {
      const { data, error } = await supabase
        .from("festival_artists")
        .insert([newArtist])
        .select()
        .single();

      if (error) throw error;
      setArtists([...artists, data]);
      toast({ title: "Success", description: "Artist added successfully" });
    } catch (error) {
      console.error("Error adding artist:", error.message);
      toast({ title: "Error", description: "Failed to add artist", variant: "destructive" });
    }
  };

  const updateArtist = async (index: number, key: keyof Artist, value: any) => {
    const updatedArtist = { ...artists[index], [key]: value };

    try {
      const { error } = await supabase
        .from("festival_artists")
        .update({ [key]: value })
        .eq("id", updatedArtist.id);

      if (error) throw error;
      const updatedArtists = [...artists];
      updatedArtists[index] = updatedArtist;
      setArtists(updatedArtists);
    } catch (error) {
      console.error("Error updating artist:", error.message);
      toast({ title: "Error", description: "Failed to update artist", variant: "destructive" });
    }
  };

  const removeArtist = async (artistId: string) => {
    try {
      const { error } = await supabase.from("festival_artists").delete().eq("id", artistId);
      if (error) throw error;
      setArtists((prev) => prev.filter((artist) => artist.id !== artistId));
      toast({ title: "Success", description: "Artist removed successfully" });
    } catch (error) {
      console.error("Error removing artist:", error.message);
      toast({ title: "Error", description: "Failed to remove artist", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={addArtist} className="mb-4">
        Add Artist
      </Button>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Artist Name</TableHead>
              <TableHead>Show Time</TableHead>
              <TableHead>Soundcheck</TableHead>
              <TableHead>FOH</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {artists.map((artist, index) => (
              <TableRow key={artist.id}>
                <TableCell>
                  <Input
                    value={artist.name}
                    onChange={(e) => updateArtist(index, "name", e.target.value)}
                    placeholder="Artist name"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={artist.show_start}
                      onChange={(e) => updateArtist(index, "show_start", e.target.value)}
                    />
                    <Input
                      type="time"
                      value={artist.show_end}
                      onChange={(e) => updateArtist(index, "show_end", e.target.value)}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={artist.soundcheck}
                    onCheckedChange={(checked) => updateArtist(index, "soundcheck", checked)}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={artist.foh_console}
                    onValueChange={(value) => updateArtist(index, "foh_console", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select console" />
                    </SelectTrigger>
                    <SelectContent>
                      {consoleModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    value={artist.notes}
                    onChange={(e) => updateArtist(index, "notes", e.target.value)}
                    placeholder="Notes"
                  />
                </TableCell>
                <TableCell>
                  <Button variant="destructive" onClick={() => removeArtist(artist.id!)}>
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};