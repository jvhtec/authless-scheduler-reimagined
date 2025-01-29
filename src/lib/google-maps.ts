export const loadGoogleMapsAPI = (apiKey: string) => {
  if (typeof window === "undefined" || window.google) return;

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
};

interface PlaceResult {
  google_place_id: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  photo_reference?: string;
}

export const getPlaceDetails = async (
  placeId: string,
  apiKey: string
): Promise<PlaceResult | null> => {
  console.log("Fetching place details for:", placeId);
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,geometry,photos&key=${apiKey}`;
  
  try {
    const response = await fetch(url);
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

export const getStaticMapImage = (latitude: number, longitude: number, apiKey: string) => {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${latitude},${longitude}&key=${apiKey}`;
};

export const getPlacePhotoUrl = (photoReference: string, apiKey: string, maxWidth = 400) => {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${apiKey}`;
};