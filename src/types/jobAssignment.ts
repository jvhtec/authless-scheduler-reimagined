export interface LocationData {
  name: string;
}

export interface JobData {
  title: string;
  start_time: string;
  locations: LocationData | null;
}

export interface TechnicianData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}