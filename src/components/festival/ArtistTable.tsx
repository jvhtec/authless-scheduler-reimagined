
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";

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
  rf_mics: number;
  rf_wireless: number;
  rf_link: string;
  infra_cat6: number;
  infra_hma: number;
  infra_coax: number;
  infra_analog: number;
  mic_pack: "festival" | "artist";
  crew: "A" | "B";
  notes: string;
}

interface ArtistTableProps {
  jobId: string;
}

const consoleModels = [
  "Digico SD12",
  "Avid S6L",
  "Yamaha CL5",
  "Midas PRO X",
  "Allen & Heath dLive",
];

const wirelessModels = [
  "Shure ULXD",
  "Sennheiser EW-D",
  "Lectrosonics Digital",
  "Audio-Technica System 10",
];

const iemModels = [
  "Sennheiser G4",
  "Shure PSM1000",
  "Lectrosonics R1A",
  "Wisycom MPR50",
];

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
      rf_mics: 0,
      rf_wireless: 0,
      rf_link: "",
      infra_cat6: 0,
      infra_hma: 0,
      infra_coax: 0,
      infra_analog: 0,
      mic_pack: "festival",
      crew: "A",
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

  const handleUpload = async (artistId: string, file: File) => {
    setUploading(true);
    try {
      const filePath = `${artistId}/${file.name}`;
      const { error } = await supabase.storage.from("artist_documents").upload(filePath, file);
      if (error) throw error;
      toast({ title: "Success", description: "File uploaded successfully" });
    } catch (error) {
      console.error("Error uploading file:", error.message);
      toast({ title: "Error", description: "Failed to upload file", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <Button onClick={addArtist}>Add Artist</Button>
        <Button onClick={() => window.print()}>Print</Button>
      </div>

      <div className="space-y-6">
        {artists.map((artist, index) => (
          <div key={artist.id} className="rounded-lg border p-4 bg-card">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Basic Info */}
              <div className="space-y-2">
                <Label>Artist Name</Label>
                <Input
                  value={artist.name}
                  onChange={(e) => updateArtist(index, "name", e.target.value)}
                />
              </div>

              {/* Show Times */}
              <div className="space-y-2">
                <Label>Show Times</Label>
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
              </div>

              {/* Soundcheck */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={artist.soundcheck}
                    onCheckedChange={(c) => updateArtist(index, "soundcheck", c)}
                  />
                  <Label>Soundcheck</Label>
                </div>
                {artist.soundcheck && (
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={artist.soundcheck_start}
                      onChange={(e) => updateArtist(index, "soundcheck_start", e.target.value)}
                    />
                    <Input
                      type="time"
                      value={artist.soundcheck_end}
                      onChange={(e) => updateArtist(index, "soundcheck_end", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* FOH Section */}
              <div className="space-y-2">
                <Label>FOH Console</Label>
                <Select
                  value={artist.foh_console}
                  onValueChange={(v) => updateArtist(index, "foh_console", v)}
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
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={artist.foh_tech}
                    onCheckedChange={(c) => updateArtist(index, "foh_tech", c)}
                  />
                  <Label>FOH Tech Required</Label>
                </div>
              </div>

              {/* Monitor Section */}
              <div className="space-y-2">
                <Label>Monitor Console</Label>
                <Select
                  value={artist.mon_console}
                  onValueChange={(v) => updateArtist(index, "mon_console", v)}
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
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={artist.mon_tech}
                    onCheckedChange={(c) => updateArtist(index, "mon_tech", c)}
                  />
                  <Label>Monitor Tech Required</Label>
                </div>
              </div>

              {/* Wireless Systems */}
              <div className="space-y-2">
                <Label>Wireless Systems</Label>
                <Select
                  value={artist.wireless_model}
                  onValueChange={(v) => updateArtist(index, "wireless_model", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {wirelessModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={artist.wireless_quantity}
                    onChange={(e) => updateArtist(index, "wireless_quantity", e.target.value)}
                    placeholder="Qty"
                  />
                  <Input
                    value={artist.wireless_band}
                    onChange={(e) => updateArtist(index, "wireless_band", e.target.value)}
                    placeholder="Frequency Band"
                  />
                </div>
              </div>

              {/* IEM Systems */}
              <div className="space-y-2">
                <Label>IEM Systems</Label>
                <Select
                  value={artist.iem_model}
                  onValueChange={(v) => updateArtist(index, "iem_model", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {iemModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={artist.iem_quantity}
                    onChange={(e) => updateArtist(index, "iem_quantity", e.target.value)}
                    placeholder="Qty"
                  />
                  <Input
                    value={artist.iem_band}
                    onChange={(e) => updateArtist(index, "iem_band", e.target.value)}
                    placeholder="Frequency Band"
                  />
                </div>
              </div>

              {/* Monitors */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={artist.monitors_enabled}
                    onCheckedChange={(c) => updateArtist(index, "monitors_enabled", c)}
                  />
                  <Label>Monitors</Label>
                </div>
                {artist.monitors_enabled && (
                  <Input
                    type="number"
                    value={artist.monitors_quantity}
                    onChange={(e) => updateArtist(index, "monitors_quantity", e.target.value)}
                    placeholder="Quantity"
                  />
                )}
              </div>

              {/* Extras */}
              <div className="space-y-2">
                <Label>Extras</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={artist.extras_sf}
                      onCheckedChange={(c) => updateArtist(index, "extras_sf", c)}
                    />
                    <Label>SF</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={artist.extras_df}
                      onCheckedChange={(c) => updateArtist(index, "extras_df", c)}
                    />
                    <Label>DF</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={artist.extras_djbooth}
                      onCheckedChange={(c) => updateArtist(index, "extras_djbooth", c)}
                    />
                    <Label>DJ Booth</Label>
                  </div>
                </div>
                <Input
                  value={artist.extras_wired}
                  onChange={(e) => updateArtist(index, "extras_wired", e.target.value)}
                  placeholder="Wired Positions"
                />
              </div>

              {/* RF Festival */}
              <div className="space-y-2">
                <Label>RF Festival</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={artist.rf_mics}
                    onChange={(e) => updateArtist(index, "rf_mics", e.target.value)}
                    placeholder="Mics"
                  />
                  <Input
                    type="number"
                    value={artist.rf_wireless}
                    onChange={(e) => updateArtist(index, "rf_wireless", e.target.value)}
                    placeholder="Wireless"
                  />
                </div>
                <Input
                  type="url"
                  value={artist.rf_link}
                  onChange={(e) => updateArtist(index, "rf_link", e.target.value)}
                  placeholder="RF Plan URL"
                />
              </div>

              {/* Infrastructure */}
              <div className="space-y-2">
                <Label>Infrastructure</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox />
                    <Label>4x Cat6</Label>
                    <Input type="number" className="w-16" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox />
                    <Label>2x HMA</Label>
                    <Input type="number" className="w-16" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox />
                    <Label>4x COAX</Label>
                    <Input type="number" className="w-16" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox />
                    <Label>Analog</Label>
                    <Input type="number" className="w-16" />
                  </div>
                </div>
              </div>

              {/* Crew and Mic Pack */}
              <div className="space-y-2">
                <Label>Crew</Label>
                <Select
                  value={artist.crew}
                  onValueChange={(v) => updateArtist(index, "crew", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Crew A</SelectItem>
                    <SelectItem value="B">Crew B</SelectItem>
                  </SelectContent>
                </Select>

                <Label>Mic Pack</Label>
                <Select
                  value={artist.mic_pack}
                  onValueChange={(v) => updateArtist(index, "mic_pack", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="festival">Festival</SelectItem>
                    <SelectItem value="artist">Artist</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes and File Upload */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={artist.notes}
                  onChange={(e) => updateArtist(index, "notes", e.target.value)}
                  placeholder="Additional notes"
                />

                <Label>Upload Rider</Label>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => e.target.files?.[0] && handleUpload(artist.id!, e.target.files[0])}
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="mt-4">
              <Button
                variant="destructive"
                onClick={() => removeArtist(artist.id!)}
                className="w-full md:w-auto"
              >
                Remove Artist
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};