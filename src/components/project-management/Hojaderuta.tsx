import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Calendar } from "lucide-react";
import { useJobSelection } from "@/hooks/useJobSelection";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AutoTableJsPDF extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

interface TravelArrangement {
  transportation_type: "van" | "sleeper_bus" | "train" | "plane" | "RV";
  pickup_address?: string;
  pickup_time?: string;
  flight_train_number?: string;
  departure_time?: string;
  arrival_time?: string;
  notes?: string;
}

interface RoomAssignment {
  room_type: "single" | "double";
  room_number?: string;
  staff_member1_id?: string;
  staff_member2_id?: string;
}

interface EventData {
  eventName: string;
  eventDates: string;
  venue: {
    name: string;
    address: string;
  };
  contacts: { name: string; role: string; phone: string }[];
  logistics: {
    transport: string;
    loadingDetails: string;
    unloadingDetails: string;
  };
  staff: { name: string; surname1: string; surname2: string; position: string }[];
  schedule: string;
  powerRequirements: string;
  auxiliaryNeeds: string;
}

const LOCAL_STORAGE_KEY = "hojaDeRutaData";

const HojaDeRutaGenerator = () => {
  const { toast } = useToast();
  const { data: jobs, isLoading: isLoadingJobs } = useJobSelection();
  
  // Initialize all state variables first
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [eventData, setEventData] = useState<EventData>({
    eventName: "",
    eventDates: "",
    venue: {
      name: "",
      address: "",
    },
    contacts: [{ name: "", role: "", phone: "" }],
    logistics: {
      transport: "",
      loadingDetails: "",
      unloadingDetails: "",
    },
    staff: [{ name: "", surname1: "", surname2: "", position: "" }],
    schedule: "",
    powerRequirements: "",
    auxiliaryNeeds: "",
  });

  const [images, setImages] = useState({
    venue: [] as File[],
  });
  const [imagePreviews, setImagePreviews] = useState({
    venue: [] as string[],
  });
  const [venueMap, setVenueMap] = useState<File | null>(null);
  const [venueMapPreview, setVenueMapPreview] = useState<string | null>(null);
  const [powerRequirements, setPowerRequirements] = useState<string>("");
  const [roomAssignments, setRoomAssignments] = useState<RoomAssignment[]>([]);
  const [travelArrangements, setTravelArrangements] = useState<TravelArrangement[]>([
    { transportation_type: "van" },
  ]);

  // Load persisted data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.eventData) setEventData(parsed.eventData);
        if (parsed.travelArrangements) setTravelArrangements(parsed.travelArrangements);
        if (parsed.roomAssignments) setRoomAssignments(parsed.roomAssignments);
      } catch (error) {
        console.error("Error parsing persisted data:", error);
      }
    }
  }, []);

  // Persist data to localStorage when state changes
  useEffect(() => {
    const dataToPersist = {
      eventData,
      travelArrangements,
      roomAssignments,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToPersist));
  }, [eventData, travelArrangements, roomAssignments]);

  // ---------------------------
  // IMAGE & FILE STATES
  // ---------------------------

  // ---------------------------
  // Utility: load image from URL as DataURL
  // ---------------------------
  const loadImageAsDataURL = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error al cargar la imagen", error);
      return null;
    }
  };

  // ---------------------------
  // FETCH FUNCTIONS
  // ---------------------------
  const fetchPowerRequirements = async (jobId: string) => {
    try {
      const { data: requirements, error } = await supabase
        .from("power_requirement_tables")
        .select("*")
        .eq("job_id", jobId);

      if (error) throw error;

      if (requirements && requirements.length > 0) {
        const formattedRequirements = requirements
          .map((req: any) => {
            return `${req.department.toUpperCase()} - ${req.table_name}:\n` +
              `Potencia Total: ${req.total_watts}W\n` +
              `Corriente por Fase: ${req.current_per_phase}A\n` +
              `PDU Recomendado: ${req.pdu_type}\n`;
          })
          .join("\n");
        setPowerRequirements(formattedRequirements);
        setEventData((prev) => ({
          ...prev,
          powerRequirements: formattedRequirements,
        }));
      }
    } catch (error: any) {
      console.error("Error al obtener los requisitos eléctricos:", error);
      toast({
        title: "Error",
        description: "No se pudieron obtener los requisitos eléctricos",
        variant: "destructive",
      });
    }
  };

  const fetchAssignedStaff = async (jobId: string) => {
    try {
      const { data: assignments, error } = await supabase
        .from("job_assignments")
        .select(
          `
          *,
          profiles:technician_id (
            first_name,
            last_name
          )
        `
        )
        .eq("job_id", jobId);

      if (error) throw error;

      if (assignments && assignments.length > 0) {
        const staffList = assignments.map((assignment: any) => ({
          name: assignment.profiles.first_name,
          surname1: assignment.profiles.last_name,
          surname2: "",
          position:
            assignment.sound_role ||
            assignment.lights_role ||
            assignment.video_role ||
            "Técnico",
        }));

        setEventData((prev) => ({
          ...prev,
          staff: staffList,
        }));
      }
    } catch (error) {
      console.error("Error al obtener el personal:", error);
      toast({
        title: "Error",
        description: "No se pudo obtener el personal asignado",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (selectedJobId && jobs) {
      const selectedJob = jobs.find((job: any) => job.id === selectedJobId);
      if (selectedJob) {
        console.log("Trabajo seleccionado:", selectedJob);
        const formattedDates = `${format(
          new Date(selectedJob.start_time),
          "dd/MM/yyyy HH:mm"
        )} - ${format(new Date(selectedJob.end_time), "dd/MM/yyyy HH:mm")}`;

        setEventData((prev) => ({
          ...prev,
          eventName: selectedJob.title,
          eventDates: formattedDates,
        }));

        fetchPowerRequirements(selectedJob.id);
        fetchAssignedStaff(selectedJob.id);

        toast({
          title: "Trabajo Seleccionado",
          description: "El formulario se ha actualizado con los detalles del trabajo",
        });
      }
    }
  }, [selectedJobId, jobs]);

  // ---------------------------
  // IMAGE HANDLERS
  // ---------------------------
  const handleImageUpload = (
    type: keyof typeof images,
    files: FileList | null
  ) => {
    if (!files) return;
    const fileArray = Array.from(files);
    const newImages = [...(images[type] || []), ...fileArray];
    setImages({ ...images, [type]: newImages });

    const previews = fileArray.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => ({
      ...prev,
      [type]: [...(prev[type] || []), ...previews],
    }));
  };

  const removeImage = (type: keyof typeof images, index: number) => {
    const newImages = [...images[type]];
    const newPreviews = [...imagePreviews[type]];
    URL.revokeObjectURL(newPreviews[index]);
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    setImages({ ...images, [type]: newImages });
    setImagePreviews({ ...imagePreviews, [type]: newPreviews });
  };

  // For venue map upload
  const handleVenueMapUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVenueMap(file);
      const preview = URL.createObjectURL(file);
      setVenueMapPreview(preview);
    }
  };

  // ---------------------------
  // CONTACT & STAFF HANDLERS
  // ---------------------------
  const handleContactChange = (index: number, field: string, value: string) => {
    const newContacts = [...eventData.contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setEventData({ ...eventData, contacts: newContacts });
  };

  const handleStaffChange = (index: number, field: string, value: string) => {
    const newStaff = [...eventData.staff];
    newStaff[index] = { ...newStaff[index], [field]: value };
    setEventData({ ...eventData, staff: newStaff });
  };

  const addContact = () => {
    setEventData({
      ...eventData,
      contacts: [...eventData.contacts, { name: "", role: "", phone: "" }],
    });
  };

  const addStaffMember = () => {
    setEventData({
      ...eventData,
      staff: [
        ...eventData.staff,
        { name: "", surname1: "", surname2: "", position: "" },
      ],
    });
  };

  // ---------------------------
  // TRAVEL & ROOM HANDLERS
  // ---------------------------
  const addTravelArrangement = () => {
    setTravelArrangements([...travelArrangements, { transportation_type: "van" }]);
  };

  const removeTravelArrangement = (index: number) => {
    const newArrangements = [...travelArrangements];
    newArrangements.splice(index, 1);
    setTravelArrangements(newArrangements);
  };

  const updateTravelArrangement = (
    index: number,
    field: keyof TravelArrangement,
    value: string
  ) => {
    const newArrangements = [...travelArrangements];
    newArrangements[index] = { ...newArrangements[index], [field]: value };
    setTravelArrangements(newArrangements);
  };

  const addRoomAssignment = () => {
    setRoomAssignments([...roomAssignments, { room_type: "single" }]);
  };

  const removeRoomAssignment = (index: number) => {
    const newAssignments = [...roomAssignments];
    newAssignments.splice(index, 1);
    setRoomAssignments(newAssignments);
  };

  const updateRoomAssignment = (
    index: number,
    field: keyof RoomAssignment,
    value: string
  ) => {
    const newAssignments = [...roomAssignments];
    newAssignments[index] = { ...newAssignments[index], [field]: value };
    setRoomAssignments(newAssignments);
  };

  // ---------------------------
  // IMAGE UPLOAD COMPONENT
  // ---------------------------
  interface ImageUploadSectionProps {
    type: keyof typeof images;
    label: string;
  }
  const ImageUploadSection = ({ type, label }: ImageUploadSectionProps) => {
    return (
      <div className="space-y-4">
        <Label htmlFor={`${type}-upload`}>{label}</Label>
        <Input
          id={`${type}-upload`}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleImageUpload(type, e.target.files)}
        />
        {imagePreviews[type]?.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {imagePreviews[type].map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`${type} vista previa ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  onClick={() => removeImage(type, index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ---------------------------
  // UPLOAD PDF TO SUPABASE
  // ---------------------------
  const uploadPdfToJob = async (
    jobId: string,
    pdfBlob: Blob,
    fileName: string
  ) => {
    try {
      console.log("Iniciando subida del PDF:", fileName);
      const sanitizedFileName = fileName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/\s+/g, "_");
      const filePath = `${crypto.randomUUID()}-${sanitizedFileName}`;
      console.log("Subiendo con la ruta sanitizada:", filePath);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("job_documents")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (uploadError) {
        console.error("Error en la subida:", uploadError);
        throw uploadError;
      }
      console.log("Archivo subido con éxito:", uploadData);
      const { error: dbError } = await supabase.from("job_documents").insert({
        job_id: jobId,
        file_name: fileName,
        file_path: filePath,
        file_type: "application/pdf",
        file_size: pdfBlob.size,
      });
      if (dbError) {
        console.error("Error en la base de datos:", dbError);
        throw dbError;
      }
      toast({
        title: "Éxito",
        description: "La Hoja de Ruta ha sido generada y subida",
      });
    } catch (error: any) {
      console.error("Fallo en la subida:", error);
      toast({
        title: "Fallo en la subida",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ---------------------------
  // GENERAR DOCUMENTO PDF (Todo en español)
  // ---------------------------
  const generateDocument = async () => {
    if (!selectedJobId) {
      toast({
        title: "Error",
        description: "Por favor, seleccione un trabajo antes de generar el documento.",
        variant: "destructive",
      });
      return;
    }
    const selectedJob = jobs?.find((job: any) => job.id === selectedJobId);
    const jobTitle = selectedJob?.title || "Trabajo_Sin_Nombre";
    const doc = new jsPDF() as AutoTableJsPDF;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const bottomMargin = 60;
    const checkPageBreak = (currentY: number): number => {
      if (currentY > pageHeight - bottomMargin) {
        doc.addPage();
        return 20;
      }
      return currentY;
    };

    // Cabecera
    doc.setFillColor(125, 1, 1);
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("Hoja de Ruta", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(16);
    doc.text(eventData.eventName, pageWidth / 2, 30, { align: "center" });
    let yPosition = 50;
    doc.setFontSize(12);
    doc.setTextColor(51, 51, 51);

    // Fechas del evento
    yPosition = checkPageBreak(yPosition);
    doc.text(`Fechas: ${eventData.eventDates}`, 20, yPosition);
    yPosition += 15;

    // Información del Lugar
    yPosition = checkPageBreak(yPosition);
    doc.setFontSize(14);
    doc.setTextColor(125, 1, 1);
    doc.text("Información del Lugar", 20, yPosition);
    yPosition += 10;
    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    doc.text(`Nombre: ${eventData.venue.name}`, 30, yPosition);
    yPosition += 7;
    doc.text(`Dirección: ${eventData.venue.address}`, 30, yPosition);
    yPosition += 15;
    if (venueMapPreview) {
      try {
        const mapWidth = 100;
        const mapHeight = 60;
        doc.addImage(venueMapPreview, "JPEG", 30, yPosition, mapWidth, mapHeight);
        yPosition += mapHeight + 10;
      } catch (error) {
        console.error("Error al agregar el mapa del lugar al PDF:", error);
      }
    }

    // Contactos
    if (eventData.contacts.some(contact => contact.name || contact.role || contact.phone)) {
      yPosition = checkPageBreak(yPosition);
      doc.setFontSize(14);
      doc.setTextColor(125, 1, 1);
      doc.text("Contactos", 20, yPosition);
      yPosition += 10;
      const contactsTableData = eventData.contacts.map(contact => [
        contact.name,
        contact.role,
        contact.phone,
      ]);
      autoTable(doc, {
        startY: yPosition,
        head: [["Nombre", "Rol", "Teléfono"]],
        body: contactsTableData,
        theme: "grid",
        styles: { fontSize: 10 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Logística
    if (
      eventData.logistics.transport ||
      eventData.logistics.loadingDetails ||
      eventData.logistics.unloadingDetails
    ) {
      yPosition = checkPageBreak(yPosition);
      doc.setFontSize(14);
      doc.setTextColor(125, 1, 1);
      doc.text("Logística", 20, yPosition);
      yPosition += 10;
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      const logisticsText = [
        { label: "Transporte:", value: eventData.logistics.transport },
        { label: "Detalles de Carga:", value: eventData.logistics.loadingDetails },
        { label: "Detalles de Descarga:", value: eventData.logistics.unloadingDetails },
      ];
      logisticsText.forEach(item => {
        if (item.value) {
          doc.text(item.label, 30, yPosition);
          const lines = doc.splitTextToSize(item.value, pageWidth - 60);
          doc.text(lines, 30, yPosition + 7);
          yPosition += lines.length * 7 + 15;
          yPosition = checkPageBreak(yPosition);
        }
      });
    }

    // Personal
    if (eventData.staff.some(person => person.name || person.surname1 || person.surname2 || person.position)) {
      yPosition = checkPageBreak(yPosition);
      doc.setFontSize(14);
      doc.setTextColor(125, 1, 1);
      doc.text("Lista de Personal", 20, yPosition);
      yPosition += 10;
      const staffTableData = eventData.staff.map(person => [
        person.name,
        person.surname1,
        person.surname2,
        person.position,
      ]);
      autoTable(doc, {
        startY: yPosition,
        head: [["Nombre", "Primer Apellido", "Segundo Apellido", "Puesto"]],
        body: staffTableData,
        theme: "grid",
        styles: { fontSize: 10 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Arreglos de Viaje (tabla)
    if (
      travelArrangements.length > 0 &&
      travelArrangements.some(arr => Object.values(arr).some(val => val && val.trim() !== ""))
    ) {
      yPosition = checkPageBreak(yPosition);
      doc.setFontSize(14);
      doc.setTextColor(125, 1, 1);
      doc.text("Arreglos de Viaje", 20, yPosition);
      yPosition += 10;
      const travelTableData = travelArrangements.map(arr => [
        arr.transportation_type,
        `${arr.pickup_address || ""} ${arr.pickup_time || ""}`.trim(),
        arr.departure_time || "",
        arr.arrival_time || "",
        arr.flight_train_number || "",
        arr.notes || "",
      ]);
      autoTable(doc, {
        startY: yPosition,
        head: [["Transporte", "Recogida", "Salida", "Llegada", "Vuelo/Tren #", "Notas"]],
        body: travelTableData,
        theme: "grid",
        styles: { fontSize: 10 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Print unique pickup addresses and associated images
      const uniquePickupAddresses = Array.from(
        new Set(
          travelArrangements
            .filter(arr => arr.pickup_address) // Filter out arrangements without pickup addresses
            .map(arr => arr.pickup_address?.trim() || '')
            .filter(address => address !== '') // Remove empty strings
        )
      );
      const transportationMapPlaceholders: { [key: string]: string } = {
        "Nave Sector-Pro. C\\Puerto Rico 6, 28971 - Griñon 1": "/lovable-uploads/IMG_7834.jpeg",
        "C\\ Corregidor Diego de Valderrabano 23, Moratalaz": "/lovable-uploads/IMG_7835.jpeg",
        "C\\ Entrepeñas 47, Ensanche de Vallecas": "/lovable-uploads/IMG_7836.jpeg",
      };
      for (const pickupAddress of uniquePickupAddresses) {
        const imageUrl = transportationMapPlaceholders[pickupAddress];
        if (imageUrl) {
          yPosition = checkPageBreak(yPosition);
          doc.setFontSize(10);
          doc.setTextColor(51, 51, 51);
          doc.text(`Dirección de Recogida: ${pickupAddress}`, 20, yPosition);
          yPosition += 7;
          const imageDataUrl = await loadImageAsDataURL(imageUrl);
          if (imageDataUrl) {
            try {
              doc.addImage(imageDataUrl, "JPEG", 20, yPosition, 100, 60);
              yPosition += 70;
            } catch (error) {
              console.error("Error al agregar la imagen del mapa de transporte:", error);
            }
          }
        }
      }
    }

    // Room Assignments: print only if at least one assignment has non-empty data
    if (
      roomAssignments.length > 0 &&
      roomAssignments.some(room =>
        (room.room_number && room.room_number.trim() !== "") ||
        (room.staff_member1_id && room.staff_member1_id.trim() !== "") ||
        (room.room_type === "double" &&
          room.staff_member2_id &&
          room.staff_member2_id.trim() !== "")
      )
    ) {
      yPosition = checkPageBreak(yPosition);
      doc.setFontSize(14);
      doc.setTextColor(125, 1, 1);
      doc.text("Asignaciones de Habitaciones", 20, yPosition);
      yPosition += 10;
      const roomTableData = roomAssignments.map(room => [
        room.room_type,
        room.room_number || "",
        room.staff_member1_id || "",
        room.room_type === "double" ? room.staff_member2_id || "" : "",
      ]);
      autoTable(doc, {
        startY: yPosition,
        head: [["Tipo de Habitación", "Número", "Personal 1", "Personal 2"]],
        body: roomTableData,
        theme: "grid",
        styles: { fontSize: 10 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Programa
    if (eventData.schedule) {
      yPosition = checkPageBreak(yPosition);
      doc.setFontSize(14);
      doc.setTextColor(125, 1, 1);
      doc.text("Programa", 20, yPosition);
      yPosition += 10;
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      const scheduleLines = doc.splitTextToSize(eventData.schedule, pageWidth - 40);
      doc.text(scheduleLines, 20, yPosition);
      yPosition += scheduleLines.length * 7 + 15;
    }

    // Requisitos Eléctricos
    if (eventData.powerRequirements) {
      yPosition = checkPageBreak(yPosition);
      doc.setFontSize(14);
      doc.setTextColor(125, 1, 1);
      doc.text("Requisitos Eléctricos", 20, yPosition);
      yPosition += 10;
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      const powerLines = doc.splitTextToSize(eventData.powerRequirements, pageWidth - 40);
      doc.text(powerLines, 20, yPosition);
      yPosition += powerLines.length * 7 + 15;
    }

    // Necesidades Auxiliares
    if (eventData.auxiliaryNeeds) {
      yPosition = checkPageBreak(yPosition);
      doc.setFontSize(14);
      doc.setTextColor(125, 1, 1);
      doc.text("Necesidades Auxiliares", 20, yPosition);
      yPosition += 10;
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      const auxLines = doc.splitTextToSize(eventData.auxiliaryNeeds, pageWidth - 40);
      doc.text(auxLines, 20, yPosition);
      yPosition += auxLines.length * 7 + 15;
    }

    // Imágenes del Lugar
    if (imagePreviews.venue.length > 0) {
      doc.addPage();
      yPosition = 20;
      doc.setFontSize(14);
      doc.setTextColor(125, 1, 1);
      doc.text("Imágenes del Lugar", 20, yPosition);
      yPosition += 20;
      const imageWidth = 80;
      const imagesPerRow = 2;
      let currentX = 20;
      for (let i = 0; i < imagePreviews.venue.length; i++) {
        try {
          doc.addImage(imagePreviews.venue[i], "JPEG", currentX, yPosition, imageWidth, 60);
          if ((i + 1) % imagesPerRow === 0) {
            yPosition += 70;
            currentX = 20;
          } else {
            currentX += imageWidth + 10;
          }
          if (yPosition > pageHeight - bottomMargin && i < imagePreviews.venue.length - 1) {
            doc.addPage();
            yPosition = 20;
            currentX = 20;
          }
        } catch (error) {
          console.error("Error al agregar la imagen:", error);
          continue;
        }
      }
    }

    // Agregar logo en cada página
    const logo = new Image();
    logo.crossOrigin = "anonymous";
    logo.src = "/lovable-uploads/ce3ff31a-4cc5-43c8-b5bb-a4056d3735e4.png";
    logo.onload = () => {
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const logoWidth = 50;
        const logoHeight = logoWidth * (logo.height / logo.width);
        const xPosition = pageWidth - logoWidth - 20;
        const yPosition = pageHeight - logoHeight - 20;
        doc.addImage(logo, "PNG", xPosition, yPosition, logoWidth, logoHeight);
      }

      // Save and upload the PDF
      const pdfBlob = doc.output("blob");
      const fileName = `Hoja_de_Ruta_${jobTitle}_${format(new Date(), "dd-MM-yyyy")}.pdf`;
      uploadPdfToJob(selectedJobId, pdfBlob, fileName);
    };
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Generador de Hoja de Ruta</CardTitle>
      </CardHeader>
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <CardContent className="space-y-6">
          {/* Job Selection */}
          <div className="space-y-2">
            <Label htmlFor="job-select">Seleccionar Trabajo</Label>
            <Select
              value={selectedJobId}
              onValueChange={(value) => setSelectedJobId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un trabajo" />
              </SelectTrigger>
              <SelectContent>
                {jobs?.map((job: any) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-name">Nombre del Evento</Label>
              <Input
                id="event-name"
                value={eventData.eventName}
                onChange={(e) =>
                  setEventData({ ...eventData, eventName: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="event-dates">Fechas</Label>
              <Input
                id="event-dates"
                value={eventData.eventDates}
                onChange={(e) =>
                  setEventData({ ...eventData, eventDates: e.target.value })
                }
              />
            </div>
          </div>

          {/* Venue Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información del Lugar</h3>
            <div>
              <Label htmlFor="venue-name">Nombre del Lugar</Label>
              <Input
                id="venue-name"
                value={eventData.venue.name}
                onChange={(e) =>
                  setEventData({
                    ...eventData,
                    venue: { ...eventData.venue, name: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="venue-address">Dirección</Label>
              <Input
                id="venue-address"
                value={eventData.venue.address}
                onChange={(e) =>
                  setEventData({
                    ...eventData,
                    venue: { ...eventData.venue, address: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="venue-map">Mapa del Lugar</Label>
              <Input
                id="venue-map"
                type="file"
                accept="image/*"
                onChange={handleVenueMapUpload}
              />
              {venueMapPreview && (
                <img
                  src={venueMapPreview}
                  alt="Mapa del lugar"
                  className="mt-4 max-w-full h-auto"
                />
              )}
            </div>
            <ImageUploadSection type="venue" label="Imágenes del Lugar" />
          </div>

          {/* Contacts */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contactos</h3>
            {eventData.contacts.map((contact, index) => (
              <div key={index} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      value={contact.name}
                      onChange={(e) =>
                        handleContactChange(index, "name", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Rol</Label>
                    <Input
                      value={contact.role}
                      onChange={(e) =>
                        handleContactChange(index, "role", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      value={contact.phone}
                      onChange={(e) =>
                        handleContactChange(index, "phone", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button onClick={addContact}>Agregar Contacto</Button>
          </div>

          {/* Logistics */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Logística</h3>
            <div>
              <Label htmlFor="transport">Transporte</Label>
              <Textarea
                id="transport"
                value={eventData.logistics.transport}
                onChange={(e) =>
                  setEventData({
                    ...eventData,
                    logistics: {
                      ...eventData.logistics,
                      transport: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="loading-details">Detalles de Carga</Label>
              <Textarea
                id="loading-details"
                value={eventData.logistics.loadingDetails}
                onChange={(e) =>
                  setEventData({
                    ...eventData,
                    logistics: {
                      ...eventData.logistics,
                      loadingDetails: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="unloading-details">Detalles de Descarga</Label>
              <Textarea
                id="unloading-details"
                value={eventData.logistics.unloadingDetails}
                onChange={(e) =>
                  setEventData({
                    ...eventData,
                    logistics: {
                      ...eventData.logistics,
                      unloadingDetails: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>

          {/* Staff */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal</h3>
            {eventData.staff.map((person, index) => (
              <div key={index} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      value={person.name}
                      onChange={(e) =>
                        handleStaffChange(index, "name", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Primer Apellido</Label>
                    <Input
                      value={person.surname1}
                      onChange={(e) =>
                        handleStaffChange(index, "surname1", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Segundo Apellido</Label>
                    <Input
                      value={person.surname2}
                      onChange={(e) =>
                        handleStaffChange(index, "surname2", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Puesto</Label>
                    <Input
                      value={person.position}
                      onChange={(e) =>
                        handleStaffChange(index, "position", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button onClick={addStaffMember}>Agregar Personal</Button>
          </div>

          {/* Travel Arrangements */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Arreglos de Viaje</h3>
            {travelArrangements.map((arrangement, index) => (
              <div key={index} className="space-y-4 border p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Transporte</Label>
                    <Select
                      value={arrangement.transportation_type}
                      onValueChange={(value: any) =>
                        updateTravelArrangement(
                          index,
                          "transportation_type",
                          value
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="van">Furgoneta</SelectItem>
                        <SelectItem value="sleeper_bus">Bus Cama</SelectItem>
                        <SelectItem value="train">Tren</SelectItem>
                        <SelectItem value="plane">Avión</SelectItem>
                        <SelectItem value="RV">Autocaravana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Dirección de Recogida</Label>
                    <Input
                      value={arrangement.pickup_address || ""}
                      onChange={(e) =>
                        updateTravelArrangement(
                          index,
                          "pickup_address",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Hora de Recogida</Label>
                    <Input
                      type="time"
                      value={arrangement.pickup_time || ""}
                      onChange={(e) =>
                        updateTravelArrangement(
                          index,
                          "pickup_time",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Número de Vuelo/Tren</Label>
                    <Input
                      value={arrangement.flight_train_number || ""}
                      onChange={(e) =>
                        updateTravelArrangement(
                          index,
                          "flight_train_number",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Hora de Salida</Label>
                    <Input
                      type="time"
                      value={arrangement.departure_time || ""}
                      onChange={(e) =>
                        updateTravelArrangement(
                          index,
                          "departure_time",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Hora de Llegada</Label>
                    <Input
                      type="time"
                      value={arrangement.arrival_time || ""}
                      onChange={(e) =>
                        updateTravelArrangement(
                          index,
                          "arrival_time",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Notas</Label>
                  <Textarea
                    value={arrangement.notes || ""}
                    onChange={(e) =>
                      updateTravelArrangement(index, "notes", e.target.value)
                    }
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={() => removeTravelArrangement(index)}
                >
                  Eliminar Arreglo
                </Button>
              </div>
            ))}
            <Button onClick={addTravelArrangement}>
              Agregar Arreglo de Viaje
            </Button>
          </div>

          {/* Room Assignments */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Asignaciones de Habitaciones</h3>
            {roomAssignments.map((room, index) => (
              <div key={index} className="space-y-4 border p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Habitación</Label>
                    <Select
                      value={room.room_type}
                      onValueChange={(value: any) =>
                        updateRoomAssignment(index, "room_type", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Individual</SelectItem>
                        <SelectItem value="double">Doble</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Número de Habitación</Label>
                    <Input
                      value={room.room_number || ""}
                      onChange={(e) =>
                        updateRoomAssignment(
                          index,
                          "room_number",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Personal 1</Label>
                    <Input
                      value={room.staff_member1_id || ""}
                      onChange={(e) =>
                        updateRoomAssignment(
                          index,
                          "staff_member1_id",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  {room.room_type === "double" && (
                    <div>
                      <Label>Personal 2</Label>
                      <Input
                        value={room.staff_member2_id || ""}
                        onChange={(e) =>
                          updateRoomAssignment(
                            index,
                            "staff_member2_id",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  onClick={() => removeRoomAssignment(index)}
                >
                  Eliminar Asignación
                </Button>
              </div>
            ))}
            <Button onClick={addRoomAssignment}>
              Agregar Asignación de Habitación
            </Button>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Programa</h3>
            <Textarea
              value={eventData.schedule}
              onChange={(e) =>
                setEventData({ ...eventData, schedule: e.target.value })
              }
              placeholder="Ingrese el programa del evento..."
            />
          </div>

          {/* Power Requirements */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Requisitos Eléctricos</h3>
            <Textarea
              value={eventData.powerRequirements}
              onChange={(e) =>
                setEventData({
                  ...eventData,
                  powerRequirements: e.target.value,
                })
              }
              placeholder="Ingrese los requisitos eléctricos..."
            />
          </div>

          {/* Auxiliary Needs */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Necesidades Auxiliares</h3>
            <Textarea
              value={eventData.auxiliaryNeeds}
              onChange={(e) =>
                setEventData({ ...eventData, auxiliaryNeeds: e.target.value })
              }
              placeholder="Ingrese las necesidades auxiliares..."
            />
          </div>

          {/* Generate Button */}
          <Button onClick={generateDocument} className="w-full">
            Generar Hoja de Ruta
          </Button>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

export default HojaDeRutaGenerator;