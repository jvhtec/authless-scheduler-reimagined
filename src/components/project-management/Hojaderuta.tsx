import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const HojaDeRutaGenerator = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/auth');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError) throw profileError;

        if (!profile || !['admin', 'logistics', 'management'].includes(profile.role)) {
          navigate('/dashboard');
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("Error checking access:", error);
        navigate('/dashboard');
      }
    };

    checkAccess();
  }, [navigate]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            *,
            location:locations(name),
            job_departments(department),
            job_assignments(
              technician_id,
              sound_role,
              lights_role,
              video_role,
              profiles(
                first_name,
                last_name
              )
            )
          `)
          .order('start_time', { ascending: true });

        if (error) throw error;
        setJobs(data || []);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        toast({
          title: "Error",
          description: "Failed to fetch jobs",
          variant: "destructive",
        });
      }
    };

    fetchJobs();
  }, [toast]);

  const uploadPdfToJob = async (jobId: string, pdfBlob: Blob, fileName: string) => {
    try {
      console.log('Starting upload for PDF:', fileName);
      
      const sanitizedFileName = fileName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\s+/g, '_');

      const filePath = `${crypto.randomUUID()}-${sanitizedFileName}`;
      
      console.log('Uploading with sanitized path:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('job_documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully:', uploadData);

      const { error: dbError } = await supabase
        .from('job_documents')
        .insert({
          job_id: jobId,
          file_name: fileName,
          file_path: filePath,
          file_type: 'application/pdf',
          file_size: pdfBlob.size
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      
      toast({
        title: "Success",
        description: "Document has been uploaded successfully.",
      });

    } catch (error: any) {
      console.error('Error in uploadPdfToJob:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const generatePDF = async () => {
    if (!selectedJob) return;

    try {
      setGenerating(true);

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
      const { width, height } = page.getSize();
      
      // Load font
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Header
      page.drawText('HOJA DE RUTA', {
        x: 50,
        y: height - 50,
        size: 20,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // Job details
      const startDate = format(new Date(selectedJob.start_time), "d 'de' MMMM 'de' yyyy", { locale: es });
      const endDate = format(new Date(selectedJob.end_time), "d 'de' MMMM 'de' yyyy", { locale: es });
      const startTime = format(new Date(selectedJob.start_time), 'HH:mm');

      const details = [
        { label: 'Evento:', value: selectedJob.title },
        { label: 'Lugar:', value: selectedJob.location?.name || 'No especificado' },
        { label: 'Fecha:', value: `${startDate} - ${endDate}` },
        { label: 'Hora:', value: startTime },
      ];

      let yPosition = height - 100;
      details.forEach(({ label, value }) => {
        page.drawText(`${label} ${value}`, {
          x: 50,
          y: yPosition,
          size: 12,
          font,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
      });

      // Departments and personnel
      const departments = selectedJob.job_departments || [];
      yPosition -= 20;

      departments.forEach((dept: any) => {
        const deptName = dept.department.charAt(0).toUpperCase() + dept.department.slice(1);
        page.drawText(deptName, {
          x: 50,
          y: yPosition,
          size: 14,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 25;

        const personnel = selectedJob.job_assignments
          .filter((assignment: any) => assignment[`${dept.department}_role`])
          .map((assignment: any) => ({
            name: `${assignment.profiles.first_name} ${assignment.profiles.last_name}`,
            role: assignment[`${dept.department}_role`],
          }));

        personnel.forEach(({ name, role }: any) => {
          page.drawText(`${name} - ${role}`, {
            x: 70,
            y: yPosition,
            size: 12,
            font,
            color: rgb(0, 0, 0),
          });
          yPosition -= 20;
        });

        yPosition -= 10;
      });

      // Notes section
      yPosition -= 20;
      page.drawText('Notas:', {
        x: 50,
        y: yPosition,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // Generate PDF bytes
      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      // Upload to Supabase
      const fileName = `Hoja_de_Ruta_${selectedJob.title}_${format(new Date(selectedJob.start_time), 'yyyy-MM-dd')}.pdf`;
      await uploadPdfToJob(selectedJob.id, pdfBlob, fileName);

      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setGenerating(false);
      toast({
        title: "Success",
        description: "Hoja de Ruta generated and downloaded successfully.",
      });
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      setGenerating(false);
      toast({
        title: "Error",
        description: "Failed to generate Hoja de Ruta: " + error.message,
        variant: "destructive",
      });
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Hoja de Ruta Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="search">Search Jobs</Label>
            <Input
              id="search"
              placeholder="Search by job title or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {filteredJobs.map(job => (
              <div
                key={job.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedJob?.id === job.id
                    ? 'bg-primary/10 border-primary'
                    : 'hover:bg-accent'
                }`}
                onClick={() => setSelectedJob(job)}
              >
                <div className="font-medium">{job.title}</div>
                <div className="text-sm text-muted-foreground">
                  {job.location?.name} • {format(new Date(job.start_time), 'MMM d, yyyy')}
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={generatePDF}
            disabled={!selectedJob || generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Hoja de Ruta'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default HojaDeRutaGenerator;