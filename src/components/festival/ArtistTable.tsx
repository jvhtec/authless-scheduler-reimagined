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

interface Artist {
  id?: string;
  job_id?: string;
  name: string;
  show_start: string;
  show_end: string;
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
  infras_cat6: boolean;
  infras_hma: boolean;
  infras_coax: boolean;
  infras_analog: number;
}

interface ArtistTableProps {
  jobId: string;
}

const consoleModels = ["Digico SD7", "Digico SD10", "Digico SD12", "Yamaha CL5", "Yamaha PM5D"];
const wirelessModels = ["Shure UR4D", "Shure AD4Q", "Sennheiser 6000"];
const iemModels = ["Shure PSM1000", "Sennheiser 2050"];

export const ArtistTable = ({ jobId }: ArtistTableProps) => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchArtists();
  }, [jobId]);

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('festival_artists')
        .select('*')
        .eq('job_id', jobId);

      if (error) throw error;
      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
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
        show_start: "",
        show_end: "",
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
        infras_cat6: false,
        infras_hma: false,
        infras_coax: false,
        infras_analog: 0
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

  const removeArtist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('festival_artists')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setArtists(artists.filter(artist => artist.id !== id));
    } catch (error) {
      console.error('Error removing artist:', error);
      toast({
        title: "Error",
        description: "Failed to remove artist",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 p-2">
        <Button onClick={addArtist} className="w-full sm:w-auto">Add Artist</Button>
        <Button onClick={() => window.print()} className="w-full sm:w-auto">Print</Button>
      </div>

      <div className="space-y-4">
        {artists.map((artist, index) => (
          <Collapsible key={artist.id} className="rounded-lg border p-4 bg-card">
            <div>
              <CollapsibleTrigger className="w-full">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{artist.name || "New Artist"}</h3>
                  {open ? <ChevronUp /> : <ChevronDown />}
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="CollapsibleContent">
                <div className="grid grid-cols-1 gap-4 pt-4">
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

                  {/* Console Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>FOH Console</Label>
                      <Select
                        value={artist.foh_console}
                        onValueChange={(v) => updateArtist(index, "foh_console", v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select console" />
                        </SelectTrigger>
                        <SelectContent>
                          {consoleModels.map((model) => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox
                          checked={artist.foh_tech}
                          onCheckedChange={(c) => updateArtist(index, "foh_tech", c)}
                        />
                        <Label>FOH Tech Required</Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Monitor Console</Label>
                      <Select
                        value={artist.mon_console}
                        onValueChange={(v) => updateArtist(index, "mon_console", v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select console" />
                        </SelectTrigger>
                        <SelectContent>
                          {consoleModels.map((model) => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox
                          checked={artist.mon_tech}
                          onCheckedChange={(c) => updateArtist(index, "mon_tech", c)}
                        />
                        <Label>Monitor Tech Required</Label>
                      </div>
                    </div>
                  </div>

                  {/* Wireless & IEM Systems */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Wireless Systems</Label>
                      <Select
                        value={artist.wireless_model}
                        onValueChange={(v) => updateArtist(index, "wireless_model", v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {wirelessModels.map((model) => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-2">
                        <Input
                          type="number"
                          value={artist.wireless_quantity}
                          className="flex-1 min-w-[100px]"
                          onChange={(e) => updateArtist(index, "wireless_quantity", parseInt(e.target.value))}
                          placeholder="Qty"
                        />
                        <Input
                          value={artist.wireless_band}
                          className="flex-1 min-w-[120px]"
                          onChange={(e) => updateArtist(index, "wireless_band", e.target.value)}
                          placeholder="Frequency Band"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>IEM Systems</Label>
                      <Select
                        value={artist.iem_model}
                        onValueChange={(v) => updateArtist(index, "iem_model", v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {iemModels.map((model) => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-2">
                        <Input
                          type="number"
                          value={artist.iem_quantity}
                          className="flex-1 min-w-[100px]"
                          onChange={(e) => updateArtist(index, "iem_quantity", parseInt(e.target.value))}
                          placeholder="Qty"
                        />
                        <Input
                          value={artist.iem_band}
                          className="flex-1 min-w-[120px]"
                          onChange={(e) => updateArtist(index, "iem_band", e.target.value)}
                          placeholder="Frequency Band"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Infrastructure & Extras */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Infrastructure</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={artist.infras_cat6}
                            onCheckedChange={(c) => updateArtist(index, "infras_cat6", c)}
                          />
                          <Label>Cat6</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={artist.infras_hma}
                            onCheckedChange={(c) => updateArtist(index, "infras_hma", c)}
                          />
                          <Label>HMA</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={artist.infras_coax}
                            onCheckedChange={(c) => updateArtist(index, "infras_coax", c)}
                          />
                          <Label>COAX</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={artist.infras_analog}
                            className="w-16"
                            onChange={(e) => updateArtist(index, "infras_analog", parseInt(e.target.value))}
                          />
                          <Label>Analog</Label>
                        </div>
                      </div>
                    </div>

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
                        className="mt-2"
                      />
                    </div>
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="destructive"
                    onClick={() => removeArtist(artist.id!)}
                    className="w-full mt-4"
                  >
                    Remove Artist
                  </Button>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>
    </div>
  );
};