import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase"; // Ensure this is properly initialized with your API key and URL
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

  const consoleModels = ["SD5", "SD10", "CL5", "PM5D"];
  const wirelessModels = ["SLX-D", "QLX-D", "ULX-D"];
  const iemModels = ["PSM900", "PSM1000"];

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

  const handleRemoveArtist = async (artistId: string) => {
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
      <div className="flex flex-wrap justify-between">
        <Button onClick={addArtist}>Add Artist</Button>
      </div>

      {/* Mobile-friendly card layout for artists */}
      <div className="space-y-4">
        {artists.map((artist, index) => (
          <div key={artist.id} className="rounded-lg border p-4 space-y-4 bg-white shadow-sm">
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Artist Name"
                value={artist.name}
                onChange={(e) => updateArtist(index, "name", e.target.value)}
              />
              <div className="flex gap-2">
                <Input
                  type="time"
                  placeholder="Show Start"
                  value={artist.show_start || ""}
                  onChange={(e) => updateArtist(index, "show_start", e.target.value)}
                />
                <Input
                  type="time"
                  placeholder="Show End"
                  value={artist.show_end || ""}
                  onChange={(e) => updateArtist(index, "show_end", e.target.value)}
                />
              </div>
              <Checkbox
                checked={artist.soundcheck}
                onCheckedChange={(checked) => updateArtist(index, "soundcheck", checked)}
              >
                Soundcheck
              </Checkbox>
              <Select
                value={artist.foh_console}
                onValueChange={(value) => updateArtist(index, "foh_console", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="FOH Console" />
                </SelectTrigger>
                <SelectContent>
                  {consoleModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button
                variant="destructive"
                onClick={() => handleRemoveArtist(artist.id!)}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};