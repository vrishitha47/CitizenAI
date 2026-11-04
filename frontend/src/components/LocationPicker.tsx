import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * A custom green map pin built as a divIcon, so we don't depend on Leaflet's
 * default marker image assets (which break under bundlers without extra config).
 */
const pinIcon = L.divIcon({
  className: "",
  html: `
    <div style="transform: translate(-50%, -100%);">
      <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 41C15 41 28 26.5 28 15A13 13 0 1 0 2 15C2 26.5 15 41 15 41Z"
              fill="#0b5d3b" stroke="white" stroke-width="2"/>
        <circle cx="15" cy="15" r="5" fill="white"/>
      </svg>
    </div>`,
  iconSize: [30, 42],
  iconAnchor: [0, 0],
});

function ClickHandler({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** Keeps the map centered when the value is set programmatically (e.g. geolocation). */
function Recenter({ center }: { center: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng], Math.max(map.getZoom(), 15));
  }, [center, map]);
  return null;
}

export function LocationPicker({
  value,
  onChange,
}: {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Default view: a reasonable world-ish center until the user picks or locates.
  const defaultCenter = useMemo<LatLng>(() => value ?? { lat: 20.5937, lng: 78.9629 }, [value]);

  function useMyLocation() {
    setGeoError(null);
    if (!("geolocation" in navigator)) {
      setGeoError("Your browser doesn't support location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setGeoError("Couldn't get your location. Tap the map to set it instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="field-label mb-0">Location</span>
        <button
          type="button"
          onClick={useMyLocation}
          className="text-sm font-medium text-sign-500 hover:text-sign-600 disabled:opacity-60"
          disabled={locating}
        >
          {locating ? "Locating…" : "Use my location"}
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-asphalt-200">
        <MapContainer
          center={[defaultCenter.lat, defaultCenter.lng]}
          zoom={value ? 15 : 4}
          style={{ height: 280, width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={onChange} />
          <Recenter center={value} />
          {value && <Marker position={[value.lat, value.lng]} icon={pinIcon} />}
        </MapContainer>
      </div>

      <p className="mt-2 text-xs text-asphalt-500">
        {value
          ? `Pinned at ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
          : "Tap the map to drop a pin where the problem is."}
      </p>
      {geoError && <p className="mt-1 text-xs text-red-600">{geoError}</p>}
    </div>
  );
}
