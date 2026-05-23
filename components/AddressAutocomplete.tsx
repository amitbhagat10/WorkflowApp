"use client";

import { useRef } from "react";
import {
  Autocomplete,
  useJsApiLoader,
  type Libraries,
} from "@react-google-maps/api";

const libraries: Libraries = ["places"];

export type SelectedAddress = {
  address: string;
  placeId: string | null;
  lat: number | null;
  lng: number | null;
};

type AddressAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: SelectedAddress) => void;
  placeholder?: string;
};

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing client address",
}: AddressAutocompleteProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
  });

  function handlePlaceChanged() {
    const place = autocompleteRef.current?.getPlace();

    if (!place) return;

    const selectedAddress =
      place.formatted_address || place.name || value || "";

    const lat = place.geometry?.location?.lat() ?? null;
    const lng = place.geometry?.location?.lng() ?? null;

    onSelect({
      address: selectedAddress,
      placeId: place.place_id || null,
      lat,
      lng,
    });
  }

  if (!apiKey) {
    return (
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Google API key missing - type address manually"
      />
    );
  }

  if (loadError) {
    return (
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Address search unavailable - type address manually"
      />
    );
  }

  if (!isLoaded) {
    return (
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Loading address search..."
      />
    );
  }

  return (
    <Autocomplete
      onLoad={(autocomplete) => {
        autocompleteRef.current = autocomplete;

        autocomplete.setFields([
          "formatted_address",
          "geometry",
          "place_id",
          "name",
        ]);

        autocomplete.setComponentRestrictions({
          country: ["au"],
        });
      }}
      onPlaceChanged={handlePlaceChanged}
    >
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </Autocomplete>
  );
}