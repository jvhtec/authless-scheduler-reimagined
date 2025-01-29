export const loadGoogleMapsAPI = (apiKey: string) => {
  if (typeof window === "undefined" || window.google) return;

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
};

export const getGeocodeFromPlaceId = async (
  placeId: string,
  apiKey: string
): Promise<{ latitude: number; longitude: number; formatted_address: string } | null> => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${apiKey}`;
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" || !data.results.length) return null;

    const { lat, lng } = data.results[0].geometry.location;
    return {
      latitude: lat,
      longitude: lng,
      formatted_address: data.results[0].formatted_address,
    };
  } catch (error) {
    console.error("Error fetching geocode data:", error);
    return null;
  }
};

export const getStaticMapImage = (latitude: number, longitude: number, apiKey: string) => {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${latitude},${longitude}&key=${apiKey}`;
};

export const getPlacePhotoUrl = (photoReference: string, apiKey: string, maxWidth = 400) => {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${apiKey}`;
};