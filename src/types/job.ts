import { Database } from "@/integrations/supabase/types";
import { Department } from "./department";

export type JobWithAssignment = Database['public']['Tables']['jobs']['Row'] & {
  location?: { name: string | null };
  job_departments?: { department: Department }[];
  sound_role?: string | null;
  lights_role?: string | null;
  video_role?: string | null;
};