import { Department } from "./department";

export interface Location {
  google_place_id: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  photo_reference?: string;
  name: string;  // Added this required field
}

export interface LocationResponse extends Location {
  id: string;
}

export interface LogisticsEvent {
  id: string;
  job_id: string;
  event_type: 'load' | 'unload';
  transport_type: string;
  event_time: string;
  event_date: string;
  loading_bay: string;
  license_plate: string;
  title?: string;
  departments: { department: Department }[];
  job?: {
    id: string;
    title: string;
  };
}