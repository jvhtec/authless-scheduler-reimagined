import React, { useState, useEffect, useRef, useCallback } from "react";
import { Location } from "@/types/location";
import { Loader2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface LocationInputProps {
  onSelectLocation: (location: Location) => void;
  defaultValue?: string;
}

const LocationInput: React.FC<LocationInputProps> = ({ onSelectLocation, defaultValue }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Fetch Google Maps API key from Supabase secrets
  useEffect(() => {
    const fetchApiKey = async () => {
      const { data, error } = await supabase
        .from("secrets")
        .select("value")
        .eq("key", "GOOGLE_MAPS_API_KEY")
        .single();

      if (error) {
        console.error("Error fetching API key:", error);
        return;
      }
      setApiKey(data.value);
    };

    fetchApiKey();
  }, []);

  const handlePlaceSelect = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    
    if (!place || !place.geometry || !place.place_id) {
      console.log("No place details available");
      return;
    }

    const selectedLocation: Location = {
      google_place_id: place.place_id,
      formatted_address: place.formatted_address || "",
      latitude: place.geometry.location?.lat() || 0,
      longitude: place.geometry.location?.lng() || 0,
      photo_reference: place.photos?.[0]?.getUrl() || "",
      name: place.name || place.formatted_address || "",
    };

    onSelectLocation(selectedLocation);
  }, [onSelectLocation]);

  useEffect(() => {
    if (!apiKey || !inputRef.current || window.google) return;

    const loadGoogleMapsScript = () => {
      setIsLoading(true);
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        setIsLoading(false);
        initializeAutocomplete();
      };

      script.onerror = () => {
        setIsLoading(false);
        console.error("Google Maps script failed to load.");
      };

      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
  }, [apiKey]);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google) return;

    try {
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ["geocode"],
      });

      autocompleteRef.current.addListener("place_changed", handlePlaceSelect);
    } catch (error) {
      console.error("Error initializing autocomplete:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        defaultValue={defaultValue || ""}
        placeholder="Search location..."
        className="w-full p-2 border border-input rounded-md pr-8"
        disabled={isLoading}
      />
      {isLoading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

export default LocationInput;