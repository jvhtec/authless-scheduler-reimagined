import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
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

const consoleModels = ["Digico SD12", "Avid S6L", "Yamaha CL5", "Midas PRO X", "Allen & Heath dLive"];
const wirelessModels = ["Shure ULXD", "Sennheiser EW-D", "Lectrosonics Digital", "Audio-Technica System 10"];
const iemModels = ["Sennheiser G4", "Shure PSM1000", "Lectrosonics R1A", "Wisycom MPR50"];

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

  const handlePrint = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    doc.setFontSize(18);
    doc.text("Festival Artist Schedule", 14, 20);

    const tableData = artists.map(artist => [
      artist.show_start,
      artist.show_end,
      artist.name,
      artist.foh_console,
      artist.foh_tech ? "✓" : "",
      artist.mon_console,
      artist.mon_tech ? "✓" : "",
      artist.extras_sf ? "✓" : "",
      artist.extras_df ? "✓" : "",
      artist.extras_djbooth ? "✓" : "",
      artist.extras_wired,
      artist.wireless_model,
      artist.wireless_quantity,
      artist.wireless_band,
      artist.iem_model,
      artist.iem_quantity,
      artist.iem_band,
      artist.infra_cat6,
      artist.infra_hma,
      artist.infra_coax,
      artist.infra_analog
    ]);

    const headers = [
      ["Slot Start", "Slot End", "Artist", "FOH Console", "FOH Tech", "Mon Console", "Mon Tech", 
       "SF", "DF", "Booth", "Wired", 
       "WL Model", "WL Qty", "WL Band", 
       "IEM Model", "IEM Qty", "IEM Band", 
       "4xCat6", "2xHMA", "4xCOAX", "Analog"]
    ];

    doc.autoTable({
      startY: 25,
      head: headers,
      body: tableData,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        overflow: "linebreak"
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold"
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 15 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { cellWidth: 10 },
        5: { cellWidth: 20 },
        6: { cellWidth: 10 },
        7: { cellWidth: 8 },
        8: { cellWidth: 8 },
        9: { cellWidth: 10 },
        10: { cellWidth: 15 },
        11: { cellWidth: 20 },
        12: { cellWidth: 10 },
        13: { cellWidth: 15 },
        14: { cellWidth: 20 },
        15: { cellWidth: 10 },
        16: { cellWidth: 15 },
        17: { cellWidth: 10 },
        18: { cellWidth: 10 },
        19: { cellWidth: 10 },
        20: { cellWidth: 10 }
      },
      margin: { left: 5 }
    });

    doc.save("festival_schedule.pdf");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 p-2">
        <Button onClick={addArtist} className="w-full sm:w-auto">Add Artist</Button>
        <Button onClick={handlePrint} className="w-full sm:w-auto">Print PDF</Button>
      </div>

      <div className="space-y-4">
        {artists.map((artist, index) => (
          <Collapsible key={artist.id} className="rounded-lg border p-4 bg-card">
            {({ open }) => (
              <>
                <CollapsibleTrigger className="w-full">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">{artist.name || "New Artist"}</h3>
                    {open ? <ChevronUp /> : <ChevronDown />}
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="CollapsibleContent">
                  <div className="grid grid-cols-1 gap-4 pt-4">
                    {/* ... (keep all existing form fields) */}
                  </div>
                </CollapsibleContent>
              </>
            )}
          </Collapsible>
        ))}
      </div>
    </div>
  );
};
