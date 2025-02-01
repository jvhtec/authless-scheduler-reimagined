import React, { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  mic_pack: string;
  rf_festival_mics: number;
  rf_festival_wireless: number;
  rf_festival_url: string;
  infras_cat6: boolean;
  infras_hma: boolean;
  infras_coax: boolean;
  infras_analog: number;
  notes: string;
  crew: string;
}

interface ArtistTableProps {
  jobId: string;
}

export const ArtistTable = ({ jobId }: ArtistTableProps) => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const { toast } = useToast();

  // Dropdown options
  const consoleModels = ['SD5', 'SD10', 'CL5', 'PM5D'];
  const wirelessModels = ['SLX-D', 'QLX-D', 'ULX-D'];
  const iemModels = ['PSM900', 'PSM1000'];
  const micPacks = ['Festival', 'Artist'];
  const crewOptions = ['A', 'B', 'C'];

  const addArtist = async () => {
    const newArtist: Artist = {
      job_id: jobId,
      name: '',
      show_start: '',
      show_end: '',
      soundcheck: false,
      soundcheck_start: '',
      soundcheck_end: '',
      foh_console: '',
      foh_tech: false,
      mon_console: '',
      mon_tech: false,
      wireless_model: '',
      wireless_quantity: 0,
      wireless_band: '',
      iem_model: '',
      iem_quantity: 0,
      iem_band: '',
      monitors_enabled: false,
      monitors_quantity: 0,
      extras_sf: false,
      extras_df: false,
      extras_djbooth: false,
      extras_wired: '',
      mic_pack: '',
      rf_festival_mics: 0,
      rf_festival_wireless: 0,
      rf_festival_url: '',
      infras_cat6: false,
      infras_hma: false,
      infras_coax: false,
      infras_analog: 0,
      notes: '',
      crew: '',
    };

    try {
      const { data, error } = await supabase
        .from('festival_artists')
        .insert([newArtist])
        .select()
        .single();

      if (error) throw error;

      setArtists([...artists, data]);
      toast({
        title: "Success",
        description: "Artist added successfully",
      });
    } catch (error) {
      console.error('Error adding artist:', error);
      toast({
        title: "Error",
        description: "Failed to add artist",
        variant: "destructive",
      });
    }
  };

  const updateArtist = async (index: number, key: keyof Artist, value: any) => {
    const updatedArtist = { ...artists[index], [key]: value };
    const artistId = updatedArtist.id;

    try {
      const { error } = await supabase
        .from('festival_artists')
        .update(updatedArtist)
        .eq('id', artistId);

      if (error) throw error;

      const updatedArtists = [...artists];
      updatedArtists[index] = updatedArtist;
      setArtists(updatedArtists);
    } catch (error) {
      console.error('Error updating artist:', error);
      toast({
        title: "Error",
        description: "Failed to update artist",
        variant: "destructive",
      });
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
              <TableHead>MON</TableHead>
              <TableHead>RF</TableHead>
              <TableHead>Monitors</TableHead>
              <TableHead>Extras</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {artists.map((artist, index) => (
              <TableRow key={artist.id}>
                <TableCell>
                  <Input
                    value={artist.name}
                    onChange={(e) => updateArtist(index, 'name', e.target.value)}
                    placeholder="Artist name"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={artist.show_start}
                      onChange={(e) => updateArtist(index, 'show_start', e.target.value)}
                    />
                    <Input
                      type="time"
                      value={artist.show_end}
                      onChange={(e) => updateArtist(index, 'show_end', e.target.value)}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <Checkbox
                      checked={artist.soundcheck}
                      onCheckedChange={(checked) => updateArtist(index, 'soundcheck', checked)}
                    />
                    {artist.soundcheck && (
                      <div className="flex gap-2">
                        <Input
                          type="time"
                          value={artist.soundcheck_start}
                          onChange={(e) => updateArtist(index, 'soundcheck_start', e.target.value)}
                        />
                        <Input
                          type="time"
                          value={artist.soundcheck_end}
                          onChange={(e) => updateArtist(index, 'soundcheck_end', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <Select
                      value={artist.foh_console}
                      onValueChange={(value) => updateArtist(index, 'foh_console', value)}
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
                    <Checkbox
                      checked={artist.foh_tech}
                      onCheckedChange={(checked) => updateArtist(index, 'foh_tech', checked)}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <Select
                      value={artist.mon_console}
                      onValueChange={(value) => updateArtist(index, 'mon_console', value)}
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
                    <Checkbox
                      checked={artist.mon_tech}
                      onCheckedChange={(checked) => updateArtist(index, 'mon_tech', checked)}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <Input
                      value={artist.wireless_model}
                      onChange={(e) => updateArtist(index, 'wireless_model', e.target.value)}
                      placeholder="Wireless Model"
                    />
                    <Input
                      type="number"
                      value={artist.wireless_quantity}
                      onChange={(e) => updateArtist(index, 'wireless_quantity', Number(e.target.value))}
                      placeholder="Wireless Quantity"
                    />
                    <Input
                      value={artist.wireless_band}
                      onChange={(e) => updateArtist(index, 'wireless_band', e.target.value)}
                      placeholder="Wireless Band"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <Input
                      value={artist.iem_model}
                      onChange={(e) => updateArtist(index, 'iem_model', e.target.value)}
                      placeholder="IEM Model"
                    />
                    <Input
                      type="number"
                      value={artist.iem_quantity}
                      onChange={(e) => updateArtist(index, 'iem_quantity', Number(e.target.value))}
                      placeholder="IEM Quantity"
                    />
                    <Input
                      value={artist.iem_band}
                      onChange={(e) => updateArtist(index, 'iem_band', e.target.value)}
                      placeholder="IEM Band"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <Checkbox
                      checked={artist.monitors_enabled}
                      onCheckedChange={(checked) => updateArtist(index, 'monitors_enabled', checked)}
                    />
                    <Input
                      type="number"
                      value={artist.monitors_quantity}
                      onChange={(e) => updateArtist(index, 'monitors_quantity', Number(e.target.value))}
                      placeholder="Monitors Quantity"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <Checkbox
                      checked={artist.extras_sf}
                      onCheckedChange={(checked) => updateArtist(index, 'extras_sf', checked)}
                    />
                    <Checkbox
                      checked={artist.extras_df}
                      onCheckedChange={(checked) => updateArtist(index, 'extras_df', checked)}
                    />
                    <Checkbox
                      checked={artist.extras_djbooth}
                      onCheckedChange={(checked) => updateArtist(index, 'extras_djbooth', checked)}
                    />
                    <Input
                      value={artist.extras_wired}
                      onChange={(e) => updateArtist(index, 'extras_wired', e.target.value)}
                      placeholder="Extras Wired"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    value={artist.notes}
                    onChange={(e) => updateArtist(index, 'notes', e.target.value)}
                    placeholder="Notes"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
