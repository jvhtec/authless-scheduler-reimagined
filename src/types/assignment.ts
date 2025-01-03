export interface Assignment {
  id: string;
  job_id: string;
  technician_id: string;
  assigned_by: string | null;
  assigned_at: string;
  sound_role: string | null;
  lights_role: string | null;
  video_role: string | null;
  technicians?: {
    name: string;
    email: string;
    department: string;
  };
}