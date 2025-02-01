import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Eye, Download, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Artist {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  stage: string;
  created_at: string;
  updated_at: string;
}

interface ArtistFile {
  id: string;
  artist_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  uploaded_at: string;
}

export function ArtistTable() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: artists, refetch: refetchArtists } = useQuery<Artist[]>({
    queryKey: ['artists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('festival_artists')
        .select('*')
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: artistFiles, refetch: refetchFiles } = useQuery<ArtistFile[]>({
    queryKey: ['artist-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('festival_artist_files')
        .select('*');
      if (error) throw error;
      return data;
    }
  });

  const handleFileUpload = async (artistId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `artists/${artistId}/${crypto.randomUUID()}.${fileExt}`;

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
          file_type: file.type
        });

      if (dbError) throw dbError;

      await refetchFiles();
      toast({
        title: "File uploaded",
        description: "The file has been uploaded successfully."
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('artist_files')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleView = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('artist_files')
        .createSignedUrl(filePath, 60);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({
        title: "Error viewing file",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (fileId: string, filePath: string) => {
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

      await refetchFiles();
      toast({
        title: "File deleted",
        description: "The file has been deleted successfully."
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredArtists = artists?.filter(artist =>
    artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    artist.stage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search artists or stages..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Artist</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Files</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredArtists?.map((artist) => (
            <TableRow key={artist.id}>
              <TableCell className="font-medium">{artist.name}</TableCell>
              <TableCell>{artist.stage}</TableCell>
              <TableCell>
                {format(new Date(artist.start_time), "HH:mm")} -{" "}
                {format(new Date(artist.end_time), "HH:mm")}
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {artistFiles
                    ?.filter(file => file.artist_id === artist.id)
                    .map(file => (
                      <div key={file.id} className="flex items-center gap-2 text-sm">
                        <span className="truncate max-w-[200px]">{file.file_name}</span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleView(file.file_path)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleDownload(file.file_path, file.file_name)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleDelete(file.id, file.file_path)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="relative">
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(artist.id, file);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}