import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, Plus, Upload, Trash2, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface ArtistFile {
  id: string;
  file_name: string;
  file_path: string;
}

interface Artist {
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

interface ArtistTableProps {
  jobId: string;
}

const consoleModels = ["Digico SD7", "Digico SD10", "Digico SD12", "Yamaha CL5", "Yamaha PM5D"];
const wirelessModels = ["Shure UR4D", "Shure AD4Q", "Sennheiser 6000"];
const iemModels = ["Shure PSM1000", "Sennheiser 2050"];

export const ArtistTable = ({ jobId }: ArtistTableProps) => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchArtists();
  }, [jobId]);

  const fetchArtists = async () => {
    try {
      console.log('Fetching artists for job:', jobId);
      
      const { data, error } = await supabase
        .from('festival_artists')
        .select(`
          *,
          festival_artist_files:festival_artist_files(*)
        `)
        .eq('job_id', jobId)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching artists:', error);
        throw error;
      }

      console.log('Fetched artists data:', data);
      setArtists(data || []);
      
      // Set initial selected date to the first artist's date if available
      if (data && data.length > 0) {
        setSelectedDate(data[0].date);
      }
    } catch (error) {
      console.error('Error in fetchArtists:', error);
      toast({
        title: "Error",
        description: "Failed to fetch artists",
        variant: "destructive",
      });
    }
  };

  const addArtist = async () => {
    try {
      const newArtist: Artist = {
        job_id: jobId,
        name: "",
        date: selectedDate || new Date().toISOString().split('T')[0],
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
        infra_analog: 0
      };

      const { data, error } = await supabase
        .from('festival_artists')
        .insert([newArtist])
        .select()
        .single();

      if (error) throw error;
      setArtists([...artists, data]);
    } catch (error) {
      console.error('Error adding artist:', error);
      toast({
        title: "Error",
        description: "Failed to add artist",
        variant: "destructive",
      });
    }
  };

  const removeArtist = async (artistId: string) => {
    try {
      const { error } = await supabase
        .from('festival_artists')
        .delete()
        .eq('id', artistId);

      if (error) throw error;

      setArtists(artists.filter(artist => artist.id !== artistId));
      toast({
        title: "Success",
        description: "Artist removed successfully"
      });
    } catch (error) {
      console.error('Error removing artist:', error);
      toast({
        title: "Error",
        description: "Failed to remove artist",
        variant: "destructive",
      });
    }
  };

  const updateArtist = async (index: number, field: keyof Artist, value: any) => {
    try {
      const updatedArtist = { ...artists[index], [field]: value };
      const { error } = await supabase
        .from('festival_artists')
        .update(updatedArtist)
        .eq('id', updatedArtist.id);

      if (error) throw error;

      const newArtists = [...artists];
      newArtists[index] = updatedArtist;
      setArtists(newArtists);
    } catch (error) {
      console.error('Error updating artist:', error);
      toast({
        title: "Error",
        description: "Failed to update artist",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (artistId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${artistId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('artist_files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('festival_artist_files')
        .insert({
          artist_id: artistId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File uploaded successfully"
      });

      fetchArtists();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
    }
  };

  const handleFileDelete = async (fileId: string, filePath: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('artist_files')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('festival_artist_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File deleted successfully"
      });

      fetchArtists();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive"
      });
    }
  };

  const handleViewFile = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('artist_files')
        .createSignedUrl(filePath, 60);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing file:', error);
      toast({
        title: "Error",
        description: "Failed to view file",
        variant: "destructive"
      });
    }
  };

  const generatePdf = () => {
    const doc = new jsPDF('landscape');
    const currentDate = new Date().toLocaleDateString();

    const columns = [
      { header: 'SLOT', dataKey: 'slot' },
      { header: 'ARTISTA', dataKey: 'artist' },
      { header: 'FoH CONSOLE', dataKey: 'foh_console' },
      { header: 'TECH', dataKey: 'foh_tech' },
      { header: 'MON CONSOLE', dataKey: 'mon_console' },
      { header: 'TECH', dataKey: 'mon_tech' },
      { header: 'SF', dataKey: 'sf' },
      { header: 'DF', dataKey: 'df' },
      { header: 'BOOTH', dataKey: 'booth' },
      { header: 'WiRED', dataKey: 'wired' },
      { header: 'WL PACK', dataKey: 'wl_pack' },
      { header: 'IEM PACK', dataKey: 'iem_pack' },
      { header: 'RF FESTIVAL', dataKey: 'rf_festival' },
      { header: 'INFRAS', dataKey: 'infras' },
    ];

    const rows = artists.map(artist => ({
      slot: `${artist.show_start} - ${artist.show_end}`,
      artist: artist.name,
      foh_console: artist.foh_console,
      foh_tech: artist.foh_tech ? '✓' : '✗',
      mon_console: artist.mon_console,
      mon_tech: artist.mon_tech ? '✓' : '✗',
      sf: artist.extras_sf ? '✓' : '✗',
      df: artist.extras_df ? '✓' : '✗',
      booth: artist.extras_djbooth ? '✓' : '✗',
      wired: artist.extras_wired,
      wl_pack: `${artist.wireless_quantity}x ${artist.wireless_model} (${artist.wireless_band})`,
      iem_pack: `${artist.iem_quantity}x ${artist.iem_model} (${artist.iem_band})`,
      rf_festival: '',
      infras: [
        artist.infra_cat6 ? 'Cat6' : null,
        artist.infra_hma ? 'HMA' : null,
        artist.infra_coax ? 'COAX' : null,
        artist.infra_analog > 0 ? `${artist.infra_analog}x Analog` : null
      ].filter(Boolean).join(' / ')
    }));

    doc.setFontSize(18);
    doc.text('Festival Production Sheet', 14, 20);
    doc.setFontSize(12);
    doc.text(`Generated: ${currentDate}`, 14, 27);

    (doc as any).autoTable({
      startY: 30,
      head: [columns.map(col => col.header)],
      body: rows.map(row => columns.map(col => row[col.dataKey as keyof typeof row])),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.5 },
      headerStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 15 },
        4: { cellWidth: 25 },
        5: { cellWidth: 15 },
        6: { cellWidth: 10 },
        7: { cellWidth: 10 },
        8: { cellWidth: 15 },
        9: { cellWidth: 20 },
        10: { cellWidth: 35 },
        11: { cellWidth: 35 },
        12: { cellWidth: 25 },
        13: { cellWidth: 30 },
      }
    });

    doc.save(`production-sheet-${currentDate}.pdf`);
  };

  const uniqueDates = [...new Set(artists.map(artist => artist.date))].sort();
  const filteredArtists = selectedDate 
    ? artists.filter(artist => artist.date === selectedDate)
    : artists;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 p-2">
        <Button onClick={addArtist} className="w-full sm:w-auto">Add Artist</Button>
        <Button onClick={generatePdf} className="w-full sm:w-auto">Generate PDF</Button>
        <Select value={selectedDate} onValueChange={setSelectedDate}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            {uniqueDates.map(date => (
              <SelectItem key={date} value={date}>
                {new Date(date).toLocaleDateString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredArtists.map((artist, index) => (
          <Collapsible key={artist.id} className="rounded-lg border p-4 bg-card">
            <CollapsibleTrigger className="w-full">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">{artist.name || "New Artist"}</h3>
                <ChevronDown className="h-4 w-4" />
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-4 pt-4">
              {/* Basic Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Artist Name</Label>
                  <Input
                    value={artist.name}
                    onChange={(e) => updateArtist(index, "name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Input
                    value={artist.stage}
                    onChange={(e) => updateArtist(index, "stage", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={artist.date}
                    onChange={(e) => updateArtist(index, "date", e.target.value)}
                  />
                </div>
              </div>

              {/* Show Times Section */}
              <div className="space-y-2">
                <Label>Show Times</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="time"
                    value={artist.show_start}
                    className="flex-1 min-w-[150px]"
                    onChange={(e) => updateArtist(index, "show_start", e.target.value)}
                  />
                  <Input
                    type="time"
                    value={artist.show_end}
                    className="flex-1 min-w-[150px]"
                    onChange={(e) => updateArtist(index, "show_end", e.target.value)}
                  />
                </div>
              </div>

              {/* Soundcheck Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={artist.soundcheck}
                    onCheckedChange={(checked) => updateArtist(index, "soundcheck", checked)}
                  />
                  <Label>Soundcheck Required</Label>
                </div>
                
                {artist.soundcheck && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Input
                      type="time"
                      value={artist.soundcheck_start}
                      className="flex-1 min-w-[150px]"
                      onChange={(e) => updateArtist(index, "soundcheck_start", e.target.value)}
                    />
                    <Input
                      type="time"
                      value={artist.soundcheck_end}
                      className="flex-1 min-w-[150px]"
                      onChange={(e) => updateArtist(index, "soundcheck_end", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Console Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>FOH Console</Label>
                  <Select
                    value={artist.foh_console}
                    onValueChange={(value) => updateArtist(index, "foh_console", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select console" />
                    </SelectTrigger>
                    <SelectContent>
                      {consoleModels.map(model => (
                        <SelectItem key={model} value={model}>{model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={artist.foh_tech}
                      onCheckedChange={(checked) => updateArtist(index, "foh_tech", checked)}
                    />
                    <Label>FOH Tech Required</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Monitor Console</Label>
                  <Select
                    value={artist.mon_console}
                    onValueChange={(value) => updateArtist(index, "mon_console", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select console" />
                    </SelectTrigger>
                    <SelectContent>
                      {consoleModels.map(model => (
                        <SelectItem key={model} value={model}>{model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={artist.mon_tech}
                      onCheckedChange={(checked) => updateArtist(index, "mon_tech", checked)}
                    />
                    <Label>Monitor Tech Required</Label>
                  </div>
                </div>
              </div>

              {/* Wireless Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Wireless System</Label>
                  <Select
                    value={artist.wireless_model}
                    onValueChange={(value) => updateArtist(index, "wireless_model", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {wirelessModels.map(model => (
                        <SelectItem key={model} value={model}>{model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Quantity"
                    value={artist.wireless_quantity}
                    onChange={(e) => updateArtist(index, "wireless_quantity", parseInt(e.target.value))}
                  />
                  <Input
                    placeholder="Frequency Band"
                    value={artist.wireless_band}
                    onChange={(e) => updateArtist(index, "wireless_band", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>IEM System</Label>
                  <Select
                    value={artist.iem_model}
                    onValueChange={(value) => updateArtist(index, "iem_model", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {iemModels.map(model => (
                        <SelectItem key={model} value={model}>{model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Quantity"
                    value={artist.iem_quantity}
                    onChange={(e) => updateArtist(index, "iem_quantity", parseInt(e.target.value))}
                  />
                  <Input
                    placeholder="Frequency Band"
                    value={artist.iem_band}
                    onChange={(e) => updateArtist(index, "iem_band", e.target.value)}
                  />
                </div>
              </div>

              {/* Infrastructure Section */}
              <div className="space-y-2">
                <Label>Infrastructure Requirements</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={artist.infra_cat6}
                      onCheckedChange={(checked) => updateArtist(index, "infra_cat6", checked)}
                    />
                    <Label>CAT6</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={artist.infra_hma}
                      onCheckedChange={(checked) => updateArtist(index, "infra_hma", checked)}
                    />
                    <Label>HMA</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={artist.infra_coax}
                      onCheckedChange={(checked) => updateArtist(index, "infra_coax", checked)}
                    />
                    <Label>COAX</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Analog Lines"
                      value={artist.infra_analog}
                      onChange={(e) => updateArtist(index, "infra_analog", parseInt(e.target.value))}
                      className="w-20"
                    />
                    <Label>Analog</Label>
                  </div>
                </div>
              </div>

              {/* Extras Section */}
              <div className="space-y-2">
                <Label>Additional Requirements</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={artist.extras_sf}
                      onCheckedChange={(checked) => updateArtist(index, "extras_sf", checked)}
                    />
                    <Label>Side Fill</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={artist.extras_df}
                      onCheckedChange={(checked) => updateArtist(index, "extras_df", checked)}
                    />
                    <Label>Drum Fill</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={artist.extras_djbooth}
                      onCheckedChange={(checked) => updateArtist(index, "extras_djbooth", checked)}
                    />
                    <Label>DJ Booth</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Wired Positions"
                      value={artist.extras_wired}
                      onChange={(e) => updateArtist(index, "extras_wired", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Documents Section */}
              <div className="space-y-2">
                <Label>Documents</Label>
                <div className="space-y-2">
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
                    <div key={file.id} className="flex items-center justify-between p-2 bg-accent/20 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{file.file_name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewFile(file.file_path)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleFileDelete(file.id, file.file_path)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={() => artist.id && removeArtist(artist.id)}
                className="w-full mt-4"
              >
                Remove Artist
              </Button>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
};
