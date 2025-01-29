import React, { useState, useEffect, useRef } from "react";
import { Input } from "./input";
import { Label } from "./label";
import { useToast } from "@/hooks/use-toast";

interface Location {
  google_place_id: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  photo_reference?: string;
}

interface LocationInputProps {
  onSelectLocation: (location: Location) => void;
  defaultValue?: string;
  label?: string;
}

const LocationInput: React.FC<LocationInputProps> = ({ 
  onSelectLocation, 
  defaultValue = "",
  label = "Location"
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initializeAutocomplete = () => {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.error("Google Maps JavaScript API not loaded");
        return;
      }

      if (inputRef.current) {
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          types: ["establishment", "geocode"],
        });

        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current?.getPlace();
          
          if (!place || !place.geometry || !place.place_id) {
            toast({
              title: "Error",
              description: "Please select a location from the dropdown",
              variant: "destructive",
            });
            return;
          }

          const selectedLocation: Location = {
            google_place_id: place.place_id,
            formatted_address: place.formatted_address || "",
            latitude: place.geometry.location?.lat() || 0,
            longitude: place.geometry.location?.lng() || 0,
            photo_reference: place.photos?.[0]?.photo_reference,
          };

          setInputValue(selectedLocation.formatted_address);
          onSelectLocation(selectedLocation);
        });
      }
    };

    initializeAutocomplete();

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onSelectLocation]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Search for a location..."
        className="w-full"
        disabled={isLoading}
      />
    </div>
  );
};

export default LocationInput;