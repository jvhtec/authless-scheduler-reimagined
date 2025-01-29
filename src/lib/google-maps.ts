import { Location } from "@/types/location";

declare global {
  interface Window {
    google: typeof google;
  }
}

export const loadGoogleMapsAPI = () => {
  if (typeof window === "undefined" || window.google) return;

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
};

export const getPlaceDetails = async (placeId: string): Promise<Location | null> => {
  console.log("Fetching place details for:", placeId);
  
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,geometry,photos&key=${process.env.VITE_GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();

    if (data.status !== "OK" || !data.result) {
      console.error("Error fetching place details:", data);
      return null;
    }

    return {
      google_place_id: placeId,
      formatted_address: data.result.formatted_address,
      latitude: data.result.geometry.location.lat,
      longitude: data.result.geometry.location.lng,
      photo_reference: data.result.photos?.[0]?.photo_reference,
    };
  } catch (error) {
    console.error("Error in getPlaceDetails:", error);
    return null;
  }
};

export const getStaticMapImage = (latitude: number, longitude: number): string => {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${latitude},${longitude}&key=${process.env.VITE_GOOGLE_MAPS_API_KEY}`;
};

export const getPlacePhotoUrl = (photoReference: string, maxWidth = 400): string => {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${process.env.VITE_GOOGLE_MAPS_API_KEY}`;
};