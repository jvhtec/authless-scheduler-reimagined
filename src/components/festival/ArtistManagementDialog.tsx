import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Upload, Loader2, X } from "lucide-react";

interface ArtistManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artist?: any;
  jobId?: string;
}

export const ArtistManagementDialog = ({
  open,
  onOpenChange,
  artist,
  jobId,
}: ArtistManagementDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
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
    wireless_model: artist?.wireless_model || "",
    wireless_quantity: artist?.wireless_quantity || 0,
    wireless_band: artist?.wireless_band || "",
    iem_model: artist?.iem_model || "",
    iem_quantity: artist?.iem_quantity || 0,
    iem_band: artist?.iem_band || "",
    monitors_enabled: artist?.monitors_enabled || false,
    monitors_quantity: artist?.monitors_quantity || 0,
    extras_sf: artist?.extras_sf || false,
    extras_df: artist?.extras_df || false,
    extras_djbooth: artist?.extras_djbooth || false,
    extras_wired: artist?.extras_wired || "",
    infra_cat6: artist?.infra_cat6 || false,
    infra_hma: artist?.infra_hma || false,
    infra_coax: artist?.infra_coax || false,
    infra_analog: artist?.infra_analog || 0,
    notes: artist?.notes || "",
  });

  // Fetch existing files when dialog opens
  const fetchFiles = useCallback(async (artistId: string) => {
    try {
      const { data, error } = await supabase
        .from('festival_artist_files')
        .select('*')
        .eq('artist_id', artistId);
      
      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      console.error('Error fetching files:', error);
      toast({
        title: "Error",
        description: "Could not load artist files",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!artist?.id || !event.target.files?.length) return;

    setUploadingFile(true);
    const file = event.target.files[0];

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${artist.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('artist_files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('festival_artist_files')
        .insert({
          artist_id: artist.id,
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

      await fetchFiles(artist.id);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Could not upload file",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteFile = async (fileId: string, filePath: string) => {
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
        description: "File deleted successfully",
      });

      setFiles(files.filter(f => f.id !== fileId));
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "Could not delete file",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId) return;

    setIsLoading(true);
    try {
      console.log("Submitting artist data:", formData);
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {artist?.id ? "Edit Artist" : "Add New Artist"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
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
              <div>
                <Label htmlFor="stage">Stage</Label>
                <Input
                  id="stage"
                  value={formData.stage}
                  onChange={(e) =>
                    setFormData({ ...formData, stage: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
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
                <div>
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
            </div>

            {/* Technical Setup */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="foh_console">FOH Console</Label>
                <Input
                  id="foh_console"
                  value={formData.foh_console}
                  onChange={(e) =>
                    setFormData({ ...formData, foh_console: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="mon_console">Monitor Console</Label>
                <Input
                  id="mon_console"
                  value={formData.mon_console}
                  onChange={(e) =>
                    setFormData({ ...formData, mon_console: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* File Upload Section - Only show when editing an artist */}
          {artist?.id && (
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="text-lg font-medium">Technical Riders & Documents</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="flex-1"
                  />
                  {uploadingFile && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="text-sm truncate flex-1">{file.file_name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFile(file.id, file.file_path)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

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
