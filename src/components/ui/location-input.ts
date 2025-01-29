import React, { useState, useEffect, useRef } from "react";

interface Location {
  google_place_id: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  photo_reference?: string;
}

interface LocationInputProps {
  onSelectLocation: (location: Location) => void;
}

const LocationInput: React.FC<LocationInputProps> = ({ onSelectLocation }) => {
  const [inputValue, setInputValue] = useState("");
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.error("Google Maps JavaScript API not loaded.");
      return;
    }

    if (inputRef.current) {
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
          photo_reference:
            place.photos && place.photos.length > 0 ? place.photos[0].getUrl() : undefined,
        };

        setInputValue(selectedLocation.formatted_address);
        onSelectLocation(selectedLocation);
      });
    }
  }, []);

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Search location..."
        className="w-full p-2 border border-gray-300 rounded"
      />
    </div>
  );
};

export default LocationInput;