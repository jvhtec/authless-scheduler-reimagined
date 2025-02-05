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

// Add the loadImageAsDataURL function before the component
const loadImageAsDataURL = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading image:", error);
    throw error;
  }
};

// ---------------------------
// SUPABASE PERSISTENCE FUNCTIONS
// ---------------------------

// Extend jsPDF to include autoTable
interface AutoTableJsPDF extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

interface TravelArrangement {
  transportation_type: "van" | "sleeper_bus" | "train" | "plane" | "rv";  // Changed RV to rv
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

const LOCAL_STORAGE_KEY = "hojaDeRutaData"; // Not used for persistence anymore

// ---------------------------
// SUPABASE PERSISTENCE FUNCTIONS
// ---------------------------

// Fetch the hoja_de_ruta record and its children for a given job_id.
const fetchHojaDeRutaData = async (jobId: string) => {
  console.log("Fetching hoja de ruta data for job:", jobId);
  
  // Fetch main record from hoja_de_ruta
  const { data: mainData, error: mainError } = await supabase
    .from("hoja_de_ruta")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle(); // Changed from .single() to .maybeSingle()

  console.log("Hoja de ruta fetch result:", { mainData, mainError });

  if (mainError) {
    console.error("Error fetching hoja de ruta:", mainError);
    throw mainError;
  }

  // If found, return the main record; otherwise, return null
  return mainData;
};

// Fetch child records for a given hoja_de_ruta_id.
const fetchChildData = async (hojaDeRutaId: number) => {
  const [
    { data: contactsData },
    { data: logisticsData },
    { data: travelData },
    { data: roomsData },
    { data: staffData },
    { data: imagesData },
  ] = await Promise.all([
    supabase.from("hoja_de_ruta_contacts").select("*").eq("hoja_de_ruta_id", hojaDeRutaId),
    supabase.from("hoja_de_ruta_logistics").select("*").eq("hoja_de_ruta_id", hojaDeRutaId),
    supabase.from("hoja_de_ruta_travel").select("*").eq("hoja_de_ruta_id", hojaDeRutaId),
    supabase.from("hoja_de_ruta_rooms").select("*").eq("hoja_de_ruta_id", hojaDeRutaId),
    supabase.from("hoja_de_ruta_staff").select("*").eq("hoja_de_ruta_id", hojaDeRutaId),
    supabase.from("hoja_de_ruta_images").select("*").eq("hoja_de_ruta_id", hojaDeRutaId),
  ]);

  return {
    contacts: contactsData || [],
    logistics: logisticsData?.[0] || {},
    travel: travelData || [],
    rooms: roomsData || [],
    staff: staffData || [],
    images: imagesData || [],
  };
};

// Save (upsert) the hoja_de_ruta data along with its child records.
const saveHojaDeRutaData = async (
  jobId: string,
  eventData: EventData,
  travelArrangements: TravelArrangement[],
  roomAssignments: RoomAssignment[]
) => {
  // Upsert main record into hoja_de_ruta
  const { data: mainData, error: mainError } = await supabase
    .from("hoja_de_ruta")
    .upsert({
      job_id: jobId,
      event_name: eventData.eventName,
      event_dates: eventData.eventDates,
      venue_name: eventData.venue.name,
      venue_address: eventData.venue.address,
      schedule: eventData.schedule,
      power_requirements: eventData.powerRequirements,
      auxiliary_needs: eventData.auxiliaryNeeds,
    })
    .select()
    .single();

  if (mainError) {
    throw mainError;
  }

  const hojaDeRutaId = mainData.id;

  // For simplicity, delete existing child records and insert new ones.
  await supabase.from("hoja_de_ruta_contacts").delete().eq("hoja_de_ruta_id", hojaDeRutaId);
  await supabase.from("hoja_de_ruta_logistics").delete().eq("hoja_de_ruta_id", hojaDeRutaId);
  await supabase.from("hoja_de_ruta_travel").delete().eq("hoja_de_ruta_id", hojaDeRutaId);
  await supabase.from("hoja_de_ruta_rooms").delete().eq("hoja_de_ruta_id", hojaDeRutaId);
  await supabase.from("hoja_de_ruta_staff").delete().eq("hoja_de_ruta_id", hojaDeRutaId);
  // Images could be handled similarly if you wish

  // Insert contacts
  if (eventData.contacts.length > 0) {
    const contactsToInsert = eventData.contacts.map(contact => ({
      hoja_de_ruta_id: hojaDeRutaId,
      name: contact.name,
      role: contact.role,
      phone: contact.phone,
    }));
    await supabase.from("hoja_de_ruta_contacts").insert(contactsToInsert);
  }

  // Insert logistics
  await supabase.from("hoja_de_ruta_logistics").insert({
    hoja_de_ruta_id: hojaDeRutaId,
    transport: eventData.logistics.transport,
    loading_details: eventData.logistics.loadingDetails,
    unloading_details: eventData.logistics.unloadingDetails,
  });

  // Insert travel arrangements
  if (travelArrangements.length > 0) {
    const travelToInsert = travelArrangements.map(arr => ({
      hoja_de_ruta_id: hojaDeRutaId,
      transportation_type: arr.transportation_type,
      pickup_address: arr.pickup_address,
      pickup_time: arr.pickup_time,
      flight_train_number: arr.flight_train_number,
      departure_time: arr.departure_time,
      arrival_time: arr.arrival_time,
      notes: arr.notes,
    }));
    await supabase.from("hoja_de_ruta_travel").insert(travelToInsert);
  }

  // Insert room assignments
  if (roomAssignments.length > 0) {
    const roomsToInsert = roomAssignments.map(room => ({
      hoja_de_ruta_id: hojaDeRutaId,
      room_type: room.room_type,
      room_number: room.room_number,
      staff_member1_id: room.staff_member1_id,
      staff_member2_id: room.room_type === "double" ? room.staff_member2_id : null,
    }));
    await supabase.from("hoja_de_ruta_rooms").insert(roomsToInsert);
  }

  // Insert staff
  if (eventData.staff.length > 0) {
    const staffToInsert = eventData.staff.map(member => ({
      hoja_de_ruta_id: hojaDeRutaId,
      name: member.name,
      surname1: member.surname1,
      surname2: member.surname2,
      position: member.position,
    }));
    await supabase.from("hoja_de_ruta_staff").insert(staffToInsert);
  }

  // (Optional) Insert images: You could loop over your images and upload them to storage, then insert their paths in hoja_de_ruta_images.

  return hojaDeRutaId;
};

const HojaDeRutaGenerator = () => {
  const { toast } = useToast();
  const { data: jobs, isLoading: isLoadingJobs } = useJobSelection();
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  // State declarations for main form data, images, travel and room assignments
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
  const [images, setImages] = useState({ venue: [] as File[] });
  const [imagePreviews, setImagePreviews] = useState({ venue: [] as string[] });
  const [venueMap, setVenueMap] = useState<File | null>(null);
  const [venueMapPreview, setVenueMapPreview] = useState<string | null>(null);
  const [roomAssignments, setRoomAssignments] = useState<RoomAssignment[]>([]);
  const [travelArrangements, setTravelArrangements] = useState<TravelArrangement[]>([
    { transportation_type: "van" },
  ]);

  // When a job is selected, fetch the persisted hoja_de_ruta data for that job.
  useEffect(() => {
    if (selectedJobId) {
      (async () => {
        try {
          const mainData = await fetchHojaDeRutaData(selectedJobId);
          if (mainData) {
            setEventData({
              eventName: mainData.event_name || "",
              eventDates: mainData.event_dates || "",
              venue: {
                name: mainData.venue_name || "",
                address: mainData.venue_address || "",
              },
              // For contacts, logistics, staff, and travel, fetch child records.
              contacts: [],
              logistics: { transport: "", loadingDetails: "", unloadingDetails: "" },
              staff: [],
              schedule: mainData.schedule || "",
              powerRequirements: mainData.power_requirements || "",
              auxiliaryNeeds: mainData.auxiliary_needs || "",
            });
            const children = await fetchChildData(mainData.id);
            setEventData(prev => ({
              ...prev,
              contacts: children.contacts,
              logistics: {
                transport: children.logistics.transport || "",
                loadingDetails: children.logistics.loading_details || "",
                unloadingDetails: children.logistics.unloading_details || "",
              },
              schedule: mainData.schedule || "",
              powerRequirements: mainData.power_requirements || "",
              auxiliaryNeeds: mainData.auxiliary_needs || "",
            }));
            setTravelArrangements(children.travel);
            setRoomAssignments(children.rooms);
            setEventData(prev => ({
              ...prev,
              staff: children.staff,
            }));
            // Note: Images can be loaded separately if needed.
          } else {
            // If no record exists, clear the form (or leave defaults).
            setEventData({
              eventName: "",
              eventDates: "",
              venue: { name: "", address: "" },
              contacts: [{ name: "", role: "", phone: "" }],
              logistics: { transport: "", loadingDetails: "", unloadingDetails: "" },
              staff: [{ name: "", surname1: "", surname2: "", position: "" }],
              schedule: "",
              powerRequirements: "",
              auxiliaryNeeds: "",
            });
            setTravelArrangements([{ transportation_type: "van" }]);
            setRoomAssignments([]);
          }
        } catch (error) {
          console.error("Error fetching hoja_de_ruta data:", error);
          toast({
            title: "Error",
            description: "No se pudo obtener la información de la hoja de ruta",
            variant: "destructive",
          });
        }
      })();
    }
  }, [selectedJobId]);

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
    newAssignments[index] = { 
      ...newAssignments[index], 
      [field]: value === "unassigned" ? null : value 
    };
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
    try {
      // First, save the current form data into Supabase.
      await saveHojaDeRutaData(selectedJobId, eventData, travelArrangements, roomAssignments);
    } catch (error: any) {
      console.error("Error guardando los datos:", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los datos de la hoja de ruta",
        variant: "destructive",
      });
      return;
    }

    const jobTitle = (jobs?.find((job: any) => job.id === selectedJobId)?.title) || "Trabajo_Sin_Nombre";
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
        contact.name || 'Sin nombre',
        contact.role || '',
        contact.phone || '',
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
      const staffTableData = eventData.staff.map(member => [
        member.name || 'Sin nombre',
        member.surname1 || '',
        member.surname2 || '',
        member.position || '',
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

      // Print unique pickup addresses and associated images.
      // (Since your addresses are hardcoded, they will always be non-empty.)
      const uniquePickupAddresses = Array.from(
        new Set(travelArrangements.map(arr => arr.pickup_address!.trim()))
      );
      // Keys must match the hardcoded pickup address strings exactly.
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

    // Room Assignments (print only if at least one assignment has data)
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
        room.room_type === "double" ? (room.staff_member2_id || "") : "",
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
        const xPositionLogo = (pageWidth - logoWidth) / 2;
        const yPositionLogo = pageHeight - logoHeight - 10;
        doc.addImage(logo, "PNG", xPositionLogo, yPositionLogo, logoWidth, logoHeight);
      }
      const blob = doc.output("blob");
      const fileName = `hoja_de_ruta_${jobTitle.replace(/\s+/g, "_")}.pdf`;
      uploadPdfToJob(selectedJobId, blob, fileName);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    };
    logo.onerror = () => {
      console.error("No se pudo cargar el logo");
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hoja_de_ruta_${eventData.eventName.replace(/\s+/g, "_")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    };
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Generador de Hoja de Ruta</CardTitle>
      </CardHeader>
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <CardContent className="space-y-6">
          {/* Alert */}
          {showAlert && (
            <Alert className="mb-4">
              <AlertDescription>{alertMessage}</AlertDescription>
            </Alert>
          )}
          {/* Selección de Trabajo */}
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="jobSelect">Seleccione Trabajo</Label>
              <Select
                value={selectedJobId || "unselected"}
                onValueChange={setSelectedJobId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione un trabajo..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingJobs ? (
                    <SelectItem value="loading">Cargando trabajos...</SelectItem>
                  ) : jobs?.length === 0 ? (
                    <SelectItem value="unselected">No hay trabajos disponibles</SelectItem>
                  ) : (
                    jobs?.map((job: any) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="eventName">Nombre del Evento</Label>
              <Input
                id="eventName"
                value={eventData.eventName}
                onChange={(e) =>
                  setEventData({ ...eventData, eventName: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="eventDates">Fechas del Evento</Label>
              <div className="relative">
                <Input
                  id="eventDates"
                  value={eventData.eventDates}
                  onChange={(e) =>
                    setEventData({ ...eventData, eventDates: e.target.value })
                  }
                />
                <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
          {/* Sección de Imágenes */}
          <div className="space-y-6">
            <ImageUploadSection type="venue" label="Imágenes del Lugar" />
          </div>
          {/* Diálogo de Lugar */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Editar Detalles del Lugar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Información del Lugar</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="venueName">Nombre del Lugar</Label>
                  <Input
                    id="venueName"
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
                  <Label htmlFor="venueAddress">Dirección</Label>
                  <Textarea
                    id="venueAddress"
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
                  <Label htmlFor="venueMapUpload">Mapa de Ubicación del Lugar</Label>
                  <Input
                    id="venueMapUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleVenueMapUpload}
                  />
                  {venueMapPreview && (
                    <img
                      src={venueMapPreview}
                      alt="Vista previa del mapa del lugar"
                      className="mt-2 max-w-full h-auto"
                    />
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {/* Diálogo de Contactos */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Editar Contactos
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Información de Contactos</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {eventData.contacts.map((contact, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Nombre"
                      value={contact.name}
                      onChange={(e) =>
                        handleContactChange(index, "name", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Rol"
                      value={contact.role}
                      onChange={(e) =>
                        handleContactChange(index, "role", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Teléfono"
                      value={contact.phone}
                      onChange={(e) =>
                        handleContactChange(index, "phone", e.target.value)
                      }
                    />
                  </div>
                ))}
                <Button onClick={addContact} variant="outline">
                  Agregar Contacto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {/* Diálogo de Personal */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Editar Lista de Personal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Lista de Personal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {eventData.staff.map((member, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Nombre"
                      value={member.name}
                      onChange={(e) =>
                        handleStaffChange(index, "name", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Primer Apellido"
                      value={member.surname1}
                      onChange={(e) =>
                        handleStaffChange(index, "surname1", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Segundo Apellido"
                      value={member.surname2}
                      onChange={(e) =>
                        handleStaffChange(index, "surname2", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Puesto"
                      value={member.position}
                      onChange={(e) =>
                        handleStaffChange(index, "position", e.target.value)
                      }
                    />
                  </div>
                ))}
                <Button onClick={addStaffMember} variant="outline">
                  Agregar Miembro de Personal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {/* Diálogo de Arreglos de Viaje */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Editar Logística de Personal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Arreglos de Viaje</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {travelArrangements.map((arrangement, index) => (
                  <div key={index} className="space-y-4 p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium">
                        Arreglo de Viaje {index + 1}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTravelArrangement(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Select
                      value={arrangement.transportation_type}
                      onValueChange={(value) =>
                        updateTravelArrangement(index, "transportation_type", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo de transporte" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="van">Furgoneta</SelectItem>
                        <SelectItem value="sleeper_bus">Sleeper Bus Litera</SelectItem>
                        <SelectItem value="train">Tren</SelectItem>
                        <SelectItem value="plane">Avión</SelectItem>
                        <SelectItem value="rv">Autocaravana</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Dirección de Recogida</Label>
                        <Select
                          value={arrangement.pickup_address || "Nave Sector-Pro. C\\Puerto Rico 6, 28971 - Griñon 1"}
                          onValueChange={(value) =>
                            updateTravelArrangement(index, "pickup_address", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione la dirección de recogida" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Nave Sector-Pro. C\\Puerto Rico 6, 28971 - Griñon 1">
                              Nave Sector-Pro. C\Puerto Rico 6, 28971 - Griñon 1
                            </SelectItem>
                            <SelectItem value="C\\ Corregidor Diego de Valderrabano 23, Moratalaz">
                              C\ Corregidor Diego de Valderrabano 23, Moratalaz
                            </SelectItem>
                            <SelectItem value="C\\ Entrepeñas 47, Ensanche de Vallecas">
                              C\ Entrepeñas 47, Ensanche de Vallecas
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Hora de Recogida</Label>
                        <Input
                          type="datetime-local"
                          value={arrangement.pickup_time || ""}
                          onChange={(e) =>
                            updateTravelArrangement(index, "pickup_time", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    {(arrangement.transportation_type === "train" ||
                      arrangement.transportation_type === "plane") && (
                      <div>
                        <Label>Número de Vuelo/Tren</Label>
                        <Input
                          value={arrangement.flight_train_number || ""}
                          onChange={(e) =>
                            updateTravelArrangement(index, "flight_train_number", e.target.value)
                          }
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Hora de Salida</Label>
                        <Input
                          type="datetime-local"
                          value={arrangement.departure_time || ""}
                          onChange={(e) =>
                            updateTravelArrangement(index, "departure_time", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label>Hora de Llegada</Label>
                        <Input
                          type="datetime-local"
                          value={arrangement.arrival_time || ""}
                          onChange={(e) =>
                            updateTravelArrangement(index, "arrival_time", e.target.value)
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
                  </div>
                ))}
                <Button onClick={addTravelArrangement} variant="outline">
                  Agregar Arreglo de Viaje
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {/* Diálogo de Asignaciones de Habitaciones */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Editar Asignaciones de Habitaciones
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Asignaciones de Habitaciones</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {roomAssignments.map((assignment, index) => (
                  <div key={index} className="space-y-4 p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium">
                        Asignación de Habitación {index + 1}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRoomAssignment(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Select
                      value={assignment.room_type}
                      onValueChange={(value) =>
                        updateRoomAssignment(index, "room_type", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo de habitación" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Individual</SelectItem>
                        <SelectItem value="double">Doble</SelectItem>
                      </SelectContent>
                    </Select>
                    <div>
                      <Label>Número de Habitación</Label>
                      <Input
                        value={assignment.room_number || ""}
                        onChange={(e) =>
                          updateRoomAssignment(index, "room_number", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label>Personal Asignado 1</Label>
                      <Select
                        value={assignment.staff_member1_id || "unassigned"}
                        onValueChange={(value) =>
                          updateRoomAssignment(
                            index,
                            "staff_member1_id",
                            value !== "unassigned" ? value : ""
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un miembro" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Sin asignar</SelectItem>
                          {eventData.staff.map((member, staffIndex) => {
                            // Create a safe value that will never be undefined
                            const value = member.name ? 
                              member.name.trim() || `staff-${staffIndex}` : 
                              `staff-${member.position || 'unnamed'}-${staffIndex}`;
                            
                            return (
                              <SelectItem 
                                key={value} 
                                value={value}
                              >
                                {`${member.name || 'Sin nombre'} ${member.surname1 || ""}`}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    {assignment.room_type === "double" && (
                      <div>
                        <Label>Personal Asignado 2</Label>
                        <Select
                          value={assignment.staff_member2_id || "unassigned"}
                          onValueChange={(value) =>
                            updateRoomAssignment(
                              index,
                              "staff_member2_id",
                              value !== "unassigned" ? value : ""
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un miembro" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Sin asignar</SelectItem>
                            {eventData.staff.map((member, staffIndex) => {
                              // Use the same safe value logic for consistency
                              const value = member.name ? 
                                member.name.trim() || `staff-${staffIndex}` : 
                                `staff-${member.position || 'unnamed'}-${staffIndex}`;
                              
                              return (
                                <SelectItem 
                                  key={value} 
                                  value={value}
                                >
                                  {`${member.name || 'Sin nombre'} ${member.surname1 || ""}`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
                <Button onClick={addRoomAssignment} variant="outline">
                  Agregar Asignación de Habitaciones
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {/* Sección de Programa */}
          <div>
            <Label htmlFor="schedule">Programa</Label>
            <Textarea
              id="schedule"
              value={eventData.schedule}
              onChange={(e) =>
                setEventData({ ...eventData, schedule: e.target.value })
              }
              className="min-h-[200px]"
              placeholder="Load in: 08:00&#10;Soundcheck: 14:00&#10;Doors: 19:00&#10;Show: 20:00..."
            />
          </div>
          {/* Sección de Requisitos Eléctricos */}
          <div>
            <Label htmlFor="powerRequirements">Requisitos Eléctricos</Label>
            <Textarea
              id="powerRequirements"
              value={eventData.powerRequirements}
              onChange={(e) =>
                setEventData({
                  ...eventData,
                  powerRequirements: e.target.value,
                })
              }
              className="min-h-[150px]"
              placeholder="Los requisitos eléctricos se completarán automáticamente cuando estén disponibles..."
            />
          </div>
          {/* Sección de Necesidades Auxiliares */}
          <div>
            <Label htmlFor="auxiliaryNeeds">Necesidades Auxiliares</Label>
            <Textarea
              id="auxiliaryNeeds"
              value={eventData.auxiliaryNeeds}
              onChange={(e) =>
                setEventData({ ...eventData, auxiliaryNeeds: e.target.value })
              }
              className="min-h-[150px]"
              placeholder="Requerimientos del equipo de carga, necesidades de equipamiento..."
            />
          </div>
          <Button onClick={generateDocument} className="w-full">
            Generar Hoja de Ruta
          </Button>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

export default HojaDeRutaGenerator;
