import { useState } from "react";
import { useJobSelection } from "@/hooks/useJobSelection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Upload } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateHojaDeRutaPDF } from "./pdfGenerator";

interface VenueImage {
  file: File;
  preview: string;
}

const HojaDeRutaForm = () => {
  const { toast } = useToast();
  const { data: jobs } = useJobSelection();
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [venueImages, setVenueImages] = useState<VenueImage[]>([]);
  const [formData, setFormData] = useState({
    logistics: {
      transport: "",
      loadingDetails: "",
      unloadingDetails: "",
    },
    schedule: "",
    powerRequirements: "",
    auxiliaryNeeds: "",
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setVenueImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setVenueImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleInputChange = (section: keyof typeof formData, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleGenerate = async () => {
    if (!selectedJobId) {
      toast({
        title: "No job selected",
        description: "Please select a job to generate the Hoja de Ruta",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get job details
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select(`
          *,
          job_assignments (
            technician_id,
            sound_role,
            lights_role,
            video_role,
            profiles (
              first_name,
              last_name
            )
          )
        `)
        .eq("id", selectedJobId)
        .single();

      if (jobError) throw jobError;

      // Generate PDF
      const pdfBlob = await generateHojaDeRutaPDF({
        jobData,
        formData,
        venueImages: venueImages.map(img => img.preview)
      });

      // Download PDF
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Hoja_de_Ruta_${jobData.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Hoja de Ruta has been generated and downloaded"
      });
    } catch (error: any) {
      console.error("Error generating Hoja de Ruta:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="jobSelect">Select Job</Label>
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a job" />
            </SelectTrigger>
            <SelectContent>
              {jobs?.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Venue Location Images</Label>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="col-span-2"
            />
            {venueImages.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image.preview}
                  alt={`Venue ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Transport Details</Label>
            <Textarea
              value={formData.logistics.transport}
              onChange={(e) => handleInputChange('logistics', 'transport', e.target.value)}
              placeholder="Number and type of vehicles, transport company details..."
            />
          </div>
          <div>
            <Label>Loading Details</Label>
            <Textarea
              value={formData.logistics.loadingDetails}
              onChange={(e) => handleInputChange('logistics', 'loadingDetails', e.target.value)}
              placeholder="Loading location, date, time..."
            />
          </div>
          <div>
            <Label>Unloading Details</Label>
            <Textarea
              value={formData.logistics.unloadingDetails}
              onChange={(e) => handleInputChange('logistics', 'unloadingDetails', e.target.value)}
              placeholder="Unloading location, date, time..."
            />
          </div>
        </div>

        <div>
          <Label>Schedule</Label>
          <Textarea
            value={formData.schedule}
            onChange={(e) => handleInputChange('schedule', '', e.target.value)}
            className="min-h-[200px]"
            placeholder="Load in: 08:00&#10;Soundcheck: 14:00&#10;Doors: 19:00&#10;Show: 20:00..."
          />
        </div>

        <div>
          <Label>Power Requirements</Label>
          <Textarea
            value={formData.powerRequirements}
            onChange={(e) => handleInputChange('powerRequirements', '', e.target.value)}
            className="min-h-[150px]"
            placeholder="Specify power needs for sound, lighting, etc..."
          />
        </div>

        <div>
          <Label>Auxiliary Needs</Label>
          <Textarea
            value={formData.auxiliaryNeeds}
            onChange={(e) => handleInputChange('auxiliaryNeeds', '', e.target.value)}
            className="min-h-[150px]"
            placeholder="Loading crew requirements, equipment needs..."
          />
        </div>

        <Button onClick={handleGenerate} className="w-full">
          Generate Hoja de Ruta
        </Button>
      </div>
    </ScrollArea>
  );
};

export default HojaDeRutaForm;