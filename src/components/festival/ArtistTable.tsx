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
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  Plus,
  Upload,
  Trash2,
  FileText,
  Edit,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Database } from "@/integrations/supabase/types";

// ----------------------
// Data Interfaces
// ----------------------

interface ArtistFile {
  id: string;
  file_name: string;
  file_path: string;
  artist_id: string;
  file_type?: string;
  file_size?: number;
}

export interface Artist {
  id?: string;
  job_id?: string;
  name: string;
  date: string;
  stage: string;
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
  extras_sf: boolean;
  extras_df: boolean;
  extras_djbooth: boolean;
  extras_wired: string;
  infra_cat6: boolean;
  infra_hma: boolean;
  infra_coax: boolean;
  infra_analog: number;
  festival_artist_files?: ArtistFile[];
}

interface Job {
  id: string;
  dates: string[]; // Array of ISO date strings
}

interface ArtistTableProps {
  jobId: string;
}

// ----------------------
// Constants for selection lists
// ----------------------
const consoleModels = [
  "Digico SD7",
  "Digico SD10",
  "Digico SD12",
  "Yamaha CL5",
  "Yamaha PM5D",
];
const wirelessModels = ["Shure UR4D", "Shure AD4Q", "Sennheiser 6000"];
const iemModels = ["Shure PSM1000", "Sennheiser 2050"];

// ----------------------
// Component
// ----------------------
export const ArtistTable = ({ jobId }: ArtistTableProps) => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [jobDates, setJobDates] = useState<string[]>([]);
  const [editingArtistId, setEditingArtistId] = useState<string | null>(null);
  const [editArtistData, setEditArtistData] = useState<Partial<Artist>>({});
  const { toast } = useToast();

  // ----------------------
  // Fetch job dates from the "jobs" table (assumes column "dates")
  // ----------------------
  const fetchJobDates = async () => {
    try {
      const { data, error } = await supabase
        .from<"jobs", Database["public"]["Tables"]["jobs"]["Row"]>("jobs")
        .select("dates")
        .eq("id", jobId)
        .single();
      if (error) {
        console.error("Error fetching job dates:", error);
        throw error;
      }
      if (data?.dates) {
        // Sort dates ascending
        const sortedDates = [...data.dates].sort();
        setJobDates(sortedDates);
      } else {
        setJobDates([]);
      }
    } catch (error) {
      console.error("Error in fetchJobDates:", error);
      toast({
        title: "Error",
        description: "Failed to fetch job dates",
        variant: "destructive",
      });
    }
  };

  // ----------------------
  // Fetch artists and their files
  // ----------------------
  const fetchArtists = async () => {
    try {
      console.log("Fetching artists for job:", jobId);
      const { data: artistsData, error: artistsError } = await supabase
        .from("festival_artists")
        .select("*")
        .eq("job_id", jobId)
        .order("date", { ascending: true });
      if (artistsError) {
        console.error("Error fetching artists:", artistsError);
        throw artistsError;
      }
      if (!artistsData?.length) {
        setArtists([]);
        return;
      }
      const { data: filesData, error: filesError } = await supabase
        .from("festival_artist_files")
        .select("*")
        .in("artist_id", artistsData.map((artist) => artist.id));
      if (filesError) {
        console.error("Error fetching files:", filesError);
        throw filesError;
      }
      const artistsWithFiles = artistsData.map((artist) => ({
        ...artist,
        festival_artist_files:
          filesData?.filter((file) => file.artist_id === artist.id) || [],
      }));
      setArtists(artistsWithFiles);
    } catch (error) {
      console.error("Error in fetchArtists:", error);
      toast({
        title: "Error",
        description: "Failed to fetch artists",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchJobDates();
      fetchArtists();
    }
  }, [jobId]);

  // ----------------------
  // Artist CRUD Operations
  // ----------------------

  // Add a new artist for a given date (from the job's dates)
  const addArtist = async (date: string) => {
    try {
      const newArtist: Artist = {
        job_id: jobId,
        name: "",
        date,
        stage: "",
        show_start: "12:00",
        show_end: "13:00",
        soundcheck: false,
        soundcheck_start: "10:00",
        soundcheck_end: "11:00",
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
        extras_sf: false,
        extras_df: false,
        extras_djbooth: false,
        extras_wired: "",
        infra_cat6: false,
        infra_hma: false,
        infra_coax: false,
        infra_analog: 0,
      };
      const { data, error } = await supabase
        .from("festival_artists")
        .insert([newArtist])
        .select()
        .single();
      if (error) throw error;
      setArtists([...artists, data]);
    } catch (error) {
      console.error("Error adding artist:", error);
      toast({
        title: "Error",
        description: "Failed to add artist",
        variant: "destructive",
      });
    }
  };

  // Remove an artist
  const removeArtist = async (artistId: string) => {
    try {
      const { error } = await supabase
        .from("festival_artists")
        .delete()
        .eq("id", artistId);
      if (error) throw error;
      setArtists(artists.filter((artist) => artist.id !== artistId));
      toast({
        title: "Success",
        description: "Artist removed successfully",
      });
    } catch (error) {
      console.error("Error removing artist:", error);
      toast({
        title: "Error",
        description: "Failed to remove artist",
        variant: "destructive",
      });
    }
  };

  // Update a single field for an artist (used during inline editing)
  const updateArtist = async (
    artistId: string,
    field: keyof Artist,
    value: any
  ) => {
    try {
      const updatedArtist = artists.find((a) => a.id === artistId);
      if (!updatedArtist) return;
      const newArtist = { ...updatedArtist, [field]: value };
      const { error } = await supabase
        .from("festival_artists")
        .update(newArtist)
        .eq("id", newArtist.id);
      if (error) throw error;
      setArtists((prev) =>
        prev.map((a) => (a.id === artistId ? newArtist : a))
      );
    } catch (error) {
      console.error("Error updating artist:", error);
      toast({
        title: "Error",
        description: "Failed to update artist",
        variant: "destructive",
      });
    }
  };

  // ----------------------
  // File upload/view/delete functions
  // ----------------------
  const handleFileUpload = async (artistId: string, file: File) => {
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${artistId}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("artist_files")
        .upload(filePath, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase
        .from("festival_artist_files")
        .insert({
          artist_id: artistId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
        });
      if (dbError) throw dbError;
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
      fetchArtists();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  const handleFileDelete = async (fileId: string, filePath: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from("artist_files")
        .remove([filePath]);
      if (storageError) throw storageError;
      const { error: dbError } = await supabase
        .from("festival_artist_files")
        .delete()
        .eq("id", fileId);
      if (dbError) throw dbError;
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      fetchArtists();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const handleViewFile = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("artist_files")
        .createSignedUrl(filePath, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (error) {
      console.error("Error viewing file:", error);
      toast({
        title: "Error",
        description: "Failed to view file",
        variant: "destructive",
      });
    }
  };

  // ----------------------
  // PDF Generation for overall production sheet (grouped by date)
  // ----------------------
  const generatePdf = () => {
    const doc = new jsPDF("landscape");
    const currentDate = new Date().toLocaleDateString();
    doc.setFontSize(18);
    doc.text("Festival Production Sheet", 14, 20);
    doc.setFontSize(12);
    doc.text(`Generated: ${currentDate}`, 14, 27);
    let startY = 35;
    // For each job date, add a header and table of artists
    jobDates.forEach((dateStr, i) => {
      const artistsForDate = artists.filter((a) => a.date === dateStr);
      if (artistsForDate.length === 0) return;
      const headerText = `Date: ${new Date(dateStr).toLocaleDateString()}`;
      doc.setFontSize(14);
      doc.text(headerText, 14, startY);
      startY += 5;
      const columns = [
        { header: "SLOT", dataKey: "slot" },
        { header: "ARTISTA", dataKey: "artist" },
        { header: "FoH CONSOLE", dataKey: "foh_console" },
        { header: "TECH", dataKey: "foh_tech" },
        { header: "MON CONSOLE", dataKey: "mon_console" },
        { header: "TECH", dataKey: "mon_tech" },
      ];
      const rows = artistsForDate.map((artist) => ({
        slot: `${artist.show_start} - ${artist.show_end}`,
        artist: artist.name,
        foh_console: artist.foh_console,
        foh_tech: artist.foh_tech ? "✓" : "✗",
        mon_console: artist.mon_console,
        mon_tech: artist.mon_tech ? "✓" : "✗",
      }));
      (doc as any).autoTable({
        startY,
        head: [columns.map((col) => col.header)],
        body: rows.map((row) =>
          columns.map((col) => row[col.dataKey as keyof typeof row])
        ),
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 1.5 },
        headerStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
      });
      startY = (doc as any).lastAutoTable.finalY + 10;
      if (startY > doc.internal.pageSize.getHeight() - 20 && i < jobDates.length - 1) {
        doc.addPage("landscape");
        startY = 20;
      }
    });
    doc.save(`production-sheet-${currentDate}.pdf`);
  };

  // ----------------------
  // Individual Artist Spec Sheet PDF Generator
  // ----------------------
  const generateArtistSpecSheet = (artist: Artist) => {
    const doc = new jsPDF(); // portrait mode
    doc.setFontSize(18);
    doc.text(`Artist Spec Sheet`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Name: ${artist.name}`, 14, 30);
    doc.text(`Stage: ${artist.stage}`, 14, 38);
    doc.text(
      `Show Time: ${artist.show_start} - ${artist.show_end}`,
      14,
      46
    );
    const specData = [
      { field: "Soundcheck", value: artist.soundcheck ? "Yes" : "No" },
      {
        field: "Soundcheck Time",
        value: `${artist.soundcheck_start} - ${artist.soundcheck_end}`,
      },
      { field: "FOH Console", value: artist.foh_console },
      { field: "FOH Tech", value: artist.foh_tech ? "Yes" : "No" },
      { field: "Monitor Console", value: artist.mon_console },
      { field: "Monitor Tech", value: artist.mon_tech ? "Yes" : "No" },
      {
        field: "Wireless",
        value: `${artist.wireless_quantity}x ${artist.wireless_model} (${artist.wireless_band})`,
      },
      {
        field: "IEM",
        value: `${artist.iem_quantity}x ${artist.iem_model} (${artist.iem_band})`,
      },
      {
        field: "Extras - Side Fill",
        value: artist.extras_sf ? "Yes" : "No",
      },
      {
        field: "Extras - Drum Fill",
        value: artist.extras_df ? "Yes" : "No",
      },
      {
        field: "Extras - DJ Booth",
        value: artist.extras_djbooth ? "Yes" : "No",
      },
      { field: "Extras - Wired", value: artist.extras_wired },
      {
        field: "Infra - CAT6",
        value: artist.infra_cat6 ? "Yes" : "No",
      },
      {
        field: "Infra - HMA",
        value: artist.infra_hma ? "Yes" : "No",
      },
      {
        field: "Infra - COAX",
        value: artist.infra_coax ? "Yes" : "No",
      },
      { field: "Infra - Analog", value: artist.infra_analog.toString() },
    ];
    (doc as any).autoTable({
      startY: 55,
      head: [["Field", "Value"]],
      body: specData.map((item) => [item.field, item.value]),
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });
    doc.save(`artist-spec-${artist.name.replace(/\s+/g, "-")}-${artist.id}.pdf`);
  };

  // ----------------------
  // Inline editing functions for an artist
  // ----------------------
  const startEditing = (artist: Artist) => {
    setEditingArtistId(artist.id || null);
    setEditArtistData({ ...artist });
  };

  const cancelEditing = () => {
    setEditingArtistId(null);
    setEditArtistData({});
  };

  const submitEditing = async (artistId: string) => {
    // Update all fields from editArtistData (for simplicity, update the entire row)
    for (const field in editArtistData) {
      // @ts-ignore
      await updateArtist(artistId, field, editArtistData[field]);
    }
    cancelEditing();
  };

  // ----------------------
  // Render: Group by each job date (from jobDates)
  // ----------------------
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 p-2">
        <Button onClick={generatePdf} className="w-full sm:w-auto">
          Generate PDF Production Sheet
        </Button>
      </div>
      {jobDates.map((dateStr) => {
        const artistsForDate = artists.filter(
          (artist) => artist.date === dateStr
        );
        return (
          <div key={dateStr} className="border p-4 rounded-lg space-y-4">
            <h2 className="text-xl font-semibold">
              {new Date(dateStr).toLocaleDateString()}
            </h2>
            {artistsForDate.length === 0 ? (
              <p className="text-muted-foreground">
                No artists assigned for this date.
              </p>
            ) : (
              <div className="space-y-4">
                {artistsForDate.map((artist) => (
                  <Collapsible
                    key={artist.id}
                    className="rounded-lg border p-4 bg-card"
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">
                          {artist.name || "New Artist"}
                        </h3>
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-4">
                      {editingArtistId === artist.id ? (
                        // Inline edit form
                        <div className="flex flex-col gap-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Artist Name</Label>
                              <Input
                                value={editArtistData.name || ""}
                                onChange={(e) =>
                                  setEditArtistData((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Stage</Label>
                              <Input
                                value={editArtistData.stage || ""}
                                onChange={(e) =>
                                  setEditArtistData((prev) => ({
                                    ...prev,
                                    stage: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Show Start</Label>
                              <Input
                                type="time"
                                value={editArtistData.show_start || "12:00"}
                                onChange={(e) =>
                                  setEditArtistData((prev) => ({
                                    ...prev,
                                    show_start: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Show End</Label>
                              <Input
                                type="time"
                                value={editArtistData.show_end || "13:00"}
                                onChange={(e) =>
                                  setEditArtistData((prev) => ({
                                    ...prev,
                                    show_end: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => submitEditing(artist.id!)}>
                              Save
                            </Button>
                            <Button variant="outline" onClick={cancelEditing}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Display artist details
                        <div className="space-y-2">
                          <p>
                            <strong>Name:</strong> {artist.name || "New Artist"}
                          </p>
                          <p>
                            <strong>Stage:</strong> {artist.stage}
                          </p>
                          <p>
                            <strong>Show Time:</strong> {artist.show_start} -{" "}
                            {artist.show_end}
                          </p>
                          <p>
                            <strong>FOH Console:</strong> {artist.foh_console}
                          </p>
                          <p>
                            <strong>Monitor Console:</strong>{" "}
                            {artist.mon_console}
                          </p>
                          {/* Additional fields can be displayed as needed */}
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        {editingArtistId !== artist.id && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditing(artist)}
                              title="Edit Artist"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                artist.id && removeArtist(artist.id)
                              }
                              title="Remove Artist"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                artist.id && generateArtistSpecSheet(artist)
                              }
                              title="Print Spec Sheet"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <div className="flex flex-col gap-2">
                          <div className="relative">
                            <input
                              type="file"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && artist.id) {
                                  handleFileUpload(artist.id, file);
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Button variant="outline" className="w-full">
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Document
                            </Button>
                          </div>
                          {artist.festival_artist_files?.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-2 bg-accent/20 rounded"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span className="text-sm">
                                  {file.file_name}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleViewFile(file.file_path)
                                  }
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleFileDelete(file.id, file.file_path)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
            <Button
              onClick={() => addArtist(dateStr)}
              className="mt-4"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Artist for {new Date(dateStr).toLocaleDateString()}
            </Button>
          </div>
        );
      })}
    </div>
  );
};
