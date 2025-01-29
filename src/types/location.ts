export interface Location {
  google_place_id: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  photo_reference?: string;
}

export interface LocationResponse {
  id: string;
  google_place_id: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  photo_reference?: string;
}

export interface LogisticsEvent {
  id: string;
  job_id?: string;
  event_type: 'load' | 'unload';
  transport_type: string;
  event_time: string;
  event_date: string;
  loading_bay: string;
  license_plate: string;
  title?: string;
  departments: { department: string }[];
  job?: {
    id: string;
    title: string;
  };
}