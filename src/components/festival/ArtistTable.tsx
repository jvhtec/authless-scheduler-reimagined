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
import jsPDF from "jspdf";
import "jspdf-autotable";

interface Artist {
  id?: string;
  job_id: string;
  name: string;
  show_start: string | null;
  show_end: string | null;
  soundcheck: boolean;
  soundcheck_start: string | null;
  soundcheck_end: string | null;
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
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

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
      show_start: null,
      show_end: null,
      soundcheck: false,
      soundcheck_start: null,
      soundcheck_end: null,
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

  const handlePrint = () => {
    const doc = new jsPDF();
    doc.text("Artist Details", 14, 10);

    const tableData = artists.map((artist) => [
      artist.name,
      artist.show_start || "N/A",
      artist.show_end || "N/A",
      artist.soundcheck ? "Yes" : "No",
      artist.foh_console || "N/A",
      artist.wireless_model || "N/A",
      artist.iem_model || "N/A",
      artist.monitors_enabled ? artist.monitors_quantity : "N/A",
      artist.notes || "N/A",
    ]);

    doc.autoTable({
      head: [
        [
          "Name",
          "Show Start",
          "Show End",
          "Soundcheck",
          "FOH Console",
          "Wireless Model",
          "IEM Model",
          "Monitors",
          "Notes",
        ],
      ],
      body: tableData,
    });

    doc.save("artist-details.pdf");
  };

  const handleUpload = async (artistId: string, file: File) => {
    setUploading(true);
    try {
      const filePath = `${artistId}/${file.name}`;
      const { error } = await supabase.storage.from("artist_documents").upload(filePath, file);

      if (error) throw error;

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading file:", error.message);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Button onClick={addArtist}>Add Artist</Button>
        <Button onClick={handlePrint}>Print</Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Show Time</TableHead>
              <TableHead>Soundcheck</TableHead>
              <TableHead>FOH Console</TableHead>
              <TableHead>Wireless</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Upload</TableHead>
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
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={artist.show_start || ""}
                      onChange={(e) => updateArtist(index, "show_start", e.target.value)}
                    />
                    <Input
                      type="time"
                      value={artist.show_end || ""}
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
                  <Input
                    value={artist.foh_console}
                    onChange={(e) => updateArtist(index, "foh_console", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={artist.wireless_model}
                    onChange={(e) => updateArtist(index, "wireless_model", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={artist.notes}
                    onChange={(e) => updateArtist(index, "notes", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="file"
                    onChange={(e) => e.target.files && handleUpload(artist.id!, e.target.files[0])}
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