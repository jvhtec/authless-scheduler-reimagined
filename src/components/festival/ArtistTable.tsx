
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/components/supabase";
import { useToast } from "@/hooks/use-toast";

// ... (keep existing interfaces and constants)

export const ArtistTable = ({ jobId }: ArtistTableProps) => {
  // ... (keep existing state and data fetching logic)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 p-2">
        <Button onClick={addArtist} className="w-full sm:w-auto">Add Artist</Button>
        <Button onClick={() => window.print()} className="w-full sm:w-auto">Print</Button>
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
                            onChange={(e) => updateArtist(index, "wireless_quantity", e.target.value)}
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
                            onChange={(e) => updateArtist(index, "iem_quantity", e.target.value)}
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
                          {[
                            { label: "4x Cat6", key: "infra_cat6" },
                            { label: "2x HMA", key: "infra_hma" },
                            { label: "4x COAX", key: "infra_coax" },
                            { label: "Analog", key: "infra_analog" },
                          ].map((item) => (
                            <div key={item.key} className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={artist[item.key]}
                                className="w-16"
                                onChange={(e) => updateArtist(index, item.key, e.target.value)}
                              />
                              <Label>{item.label}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Extras</Label>
                        <div className="flex flex-wrap gap-4">
                          {[
                            { label: "SF", key: "extras_sf" },
                            { label: "DF", key: "extras_df" },
                            { label: "DJ Booth", key: "extras_djbooth" },
                          ].map((item) => (
                            <div key={item.key} className="flex items-center gap-2">
                              <Checkbox
                                checked={artist[item.key]}
                                onCheckedChange={(c) => updateArtist(index, item.key, c)}
                              />
                              <Label>{item.label}</Label>
                            </div>
                          ))}
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
              </>
            )}
          </Collapsible>
        ))}
      </div>
    </div>
  );
};
