import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://syldobdcdsgfgjtbuwxm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bGRvYmRjZHNnZmdqdGJ1d3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NDE1ODcsImV4cCI6MjA1MTUxNzU4N30.iLtE6_xC0FE21JKzy77UPAvferh4l1WeLvvVCn15YJc';

// Fetch a location by Google Place ID
export const fetchLocationByPlaceId = async (placeId: string) => {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("google_place_id", placeId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching location:", error);
    return null;
  }

  return data;
};

// Insert a new location if it doesn't exist
export const upsertLocation = async (location: {
  google_place_id: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  photo_reference?: string;
}) => {
  const existingLocation = await fetchLocationByPlaceId(location.google_place_id);
  
  if (existingLocation) return existingLocation; // Return existing location if found

  const { data, error } = await supabase
    .from("locations")
    .insert([location])
    .select()
    .single();

  if (error) {
    console.error("Error inserting location:", error);
    return null;
  }

  return data;
};

// Fetch location details for a given job
export const fetchJobLocation = async (jobId: string) => {
  const { data, error } = await supabase
    .from("jobs")
    .select("locations(*)") // Fetch related location details
    .eq("id", jobId)
    .single();

  if (error) {
    console.error("Error fetching job location:", error);
    return null;
  }

  return data?.locations;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: localStorage,
    storageKey: 'supabase.auth.token',
  }
});