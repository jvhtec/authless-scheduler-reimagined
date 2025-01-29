import { createClient } from '@supabase/supabase-js';
import { Location, LocationResponse } from '@/types/location';

const supabaseUrl = 'https://syldobdcdsgfgjtbuwxm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bGRvYmRjZHNnZmdqdGJ1d3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NDE1ODcsImV4cCI6MjA1MTUxNzU4N30.iLtE6_xC0FE21JKzy77UPAvferh4l1WeLvvVCn15YJc';

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

// Fetch a location by Google Place ID
export const fetchLocationByPlaceId = async (placeId: string) => {
  console.log("Fetching location for place ID:", placeId);
  
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("google_place_id", placeId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching location:", error);
    return null;
  }

  return data;
};

// Insert a new location if it doesn't exist
export const upsertLocation = async (location: Location) => {
  console.log("Upserting location:", location);
  
  const existingLocation = await fetchLocationByPlaceId(location.google_place_id);
  if (existingLocation) {
    console.log("Found existing location:", existingLocation);
    return existingLocation;
  }

  const { data, error } = await supabase
    .from("locations")
    .insert([location])
    .select()
    .single();

  if (error) {
    console.error("Error inserting location:", error);
    return null;
  }

  console.log("Created new location:", data);
  return data;
};

export const fetchJobLocation = async (jobId: string): Promise<LocationResponse | null> => {
  console.log('Fetching location for job:', jobId);
  
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('location_id')
    .eq('id', jobId)
    .single();

  if (jobError || !job?.location_id) {
    console.error('Error fetching job:', jobError);
    return null;
  }

  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('*')
    .eq('id', job.location_id)
    .single();

  if (locationError) {
    console.error('Error fetching location:', locationError);
    return null;
  }

  return location as LocationResponse;
};