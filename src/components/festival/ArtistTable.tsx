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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  mic_pack: string;
  rf_festival_mics: number;
  rf_festival_wireless: number;
  rf_festival_url: string;
  infras_cat6: boolean;
  infras_hma: boolean;
  infras_coax: boolean;
  infras_analog: number;
  notes: string;
  crew: "A" | "B";
  pdf_rider_url: string;
}

interface ArtistTableProps {
  jobId: string;
}

export const ArtistTable = ({ jobId }: ArtistTableProps) => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Dropdown options
  const consoleModels = ["SD5", "SD10", "CL5", "PM5D"];
  const wirelessModels = ["SLX-D", "QLX-D", "ULX-D"];
  const iemModels = ["PSM900", "PSM1000"];
  const frequencyBands = {
    "SLX-D": ["Band G58", "Band G59"],
    "QLX-D": ["Band J50", "Band K51"],
    "ULX-D": ["Band J52", "Band G53"],
    "PSM900": ["Band H20", "Band K15"],
    "PSM1000": ["Band J51", "Band K53"],
  };

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
      mic_pack: "Festival",
      rf_festival_mics: 0,
      rf_festival_wireless: 0,
      rf_festival_url: "",
      infras_cat6: false,
      infras_hma: false,
      infras_coax: false,
      infras_analog: 0,
      notes: "",
      crew: "A",
      pdf_rider_url: "",
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

  const handleUploadPDF = async (artistId: string, file: File) => {
    setUploading(true);
    try {
      const filePath = `${artistId}/${file.name}`;
      const { error, data } = await supabase.storage.from("artist_documents").upload(filePath, file);

      if (error) throw error;

      const url = `${supabase.storage.from("artist_documents").getPublicUrl(filePath).data.publicUrl}`;
      await updateArtist(artists.findIndex((a) => a.id === artistId), "pdf_rider_url", url);

      toast({
        title: "Success",
        description: "PDF uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading PDF:", error.message);
      toast({
        title: "Error",
        description: "Failed to upload PDF",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 justify-between">
        <Button onClick={addArtist}>Add Artist</Button>
      </div>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Show Times</TableHead>
              <TableHead>Soundcheck</TableHead>
              <TableHead>FOH Console</TableHead>
              <TableHead>Mon Console</TableHead>
              <TableHead>Wireless</TableHead>
              <TableHead>RF Festival</TableHead>
              <TableHead>Infrastructure</TableHead>
              <TableHead>Extras</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>PDF</TableHead>
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
                  {/* More inputs */}
                </TableCell>
                <TableCell>
                  <input type="file" onChange={(e) => e.target.files && handleUploadPDF(artist.id!, e.target.files[0])} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};