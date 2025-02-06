import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface ArtistManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artist?: any;
  jobId?: string;
  start_time?: string;
  end_time?: string;
}

export const ArtistManagementDialog = ({
  open,
  onOpenChange,
  artist,
  jobId,
  start_time,
  end_time
}: ArtistManagementDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: artist?.name || "",
    stage: artist?.stage || "",
    show_start: artist?.show_start || "",
    show_end: artist?.show_end || "",
    soundcheck: artist?.soundcheck || false,
    soundcheck_start: artist?.soundcheck_start || "",
    soundcheck_end: artist?.soundcheck_end || "",
    foh_console: artist?.foh_console || "",
    mon_console: artist?.mon_console || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId) return;

    setIsLoading(true);
    try {
      const data = {
        ...formData,
        job_id: jobId,
      };

      const { error } = artist?.id
        ? await supabase
            .from("festival_artists")
            .update(data)
            .eq("id", artist.id)
        : await supabase.from("festival_artists").insert(data);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Artist ${artist?.id ? "updated" : "added"} successfully`,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving artist:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {artist?.id ? "Edit Artist" : "Add New Artist"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Artist Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stage">Stage</Label>
            <Input
              id="stage"
              value={formData.stage}
              onChange={(e) =>
                setFormData({ ...formData, stage: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="show_start">Show Start</Label>
              <Input
                id="show_start"
                type="time"
                value={formData.show_start}
                onChange={(e) =>
                  setFormData({ ...formData, show_start: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="show_end">Show End</Label>
              <Input
                id="show_end"
                type="time"
                value={formData.show_end}
                onChange={(e) =>
                  setFormData({ ...formData, show_end: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};