import React, { useState, useEffect, useRef } from "react";
import { Location } from "@/types/location";

interface LocationInputProps {
  onSelectLocation: (location: Location) => void;
  defaultValue?: string;
}

declare global {
  interface Window {
    google: typeof google;
  }
}

const LocationInput: React.FC<LocationInputProps> = ({ onSelectLocation, defaultValue }) => {
  const [inputValue, setInputValue] = useState(defaultValue || "");
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loadGoogleMapsScript = () => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      script.onload = initializeAutocomplete;
    };

    const initializeAutocomplete = () => {
      if (!inputRef.current) return;

      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ["geocode"],
      });

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place || !place.geometry || !place.place_id) return;

        const selectedLocation: Location = {
          google_place_id: place.place_id,
          formatted_address: place.formatted_address || "",
          latitude: place.geometry.location?.lat() || 0,
          longitude: place.geometry.location?.lng() || 0,
          photo_reference: place.photos?.[0]?.getUrl() || undefined,
        };

        setInputValue(selectedLocation.formatted_address);
        onSelectLocation(selectedLocation);
      });
    };

    if (!window.google) {
      loadGoogleMapsScript();
    } else {
      initializeAutocomplete();
    }
  }, [onSelectLocation]);

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Search location..."
        className="w-full p-2 border border-input rounded-md"
      />
    </div>
  );
};

export default LocationInput;