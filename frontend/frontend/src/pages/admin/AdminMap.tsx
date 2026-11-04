import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AdminLayout } from "../../components/AdminLayout";
import { fetchMapData } from "../../api/admin";
import { errorMessage } from "../../api/client";
import type { Complaint, Severity } from "../../types";

const SEVERITY_COLOR: Record<string, string> = {
  LOW: "#b3bab6",
  MEDIUM: "#f5a524",
  HIGH: "#ea7317",
  CRITICAL: "#dc2626",
  UNSET: "#0b5d3b",
};

// Build (and cache) a colored pin per severity.
const iconCache: Record<string, L.DivIcon> = {};
function pin(severity: Severity | null): L.DivIcon {
  const key = severity ?? "UNSET";
  if (!iconCache[key]) {
    const color = SEVERITY_COLOR[key] ?? SEVERITY_COLOR.UNSET;
    iconCache[key] = L.divIcon({
      className: "",
      html: `<div style="transform: translate(-50%,-100%);">
        <svg width="26" height="36" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 41C15 41 28 26.5 28 15A13 13 0 1 0 2 15C2 26.5 15 41 15 41Z" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="15" cy="15" r="4.5" fill="white"/>
        </svg></div>`,
      iconSize: [26, 36],
      iconAnchor: [0, 0],
    });
  }
  return iconCache[key];
}

export default function AdminMap() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchMapData()
      .then(setComplaints)
      .catch((err) => setError(errorMessage(err, "Couldn't load the map.")))
      .finally(() => setLoaded(true));
  }, []);

  // Center on the average of all pins, or a sensible default.
  const center = useMemo<[number, number]>(() => {
    const pts = complaints.filter((c) => c.latitude != null && c.longitude != null);
    if (pts.length === 0) return [20.5937, 78.9629];
    const lat = pts.reduce((s, c) => s + (c.latitude ?? 0), 0) / pts.length;
    const lng = pts.reduce((s, c) => s + (c.longitude ?? 0), 0) / pts.length;
    return [lat, lng];
  }, [complaints]);

  return (
    <AdminLayout>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-asphalt-900">Issue map</h1>
          <p className="mt-1 text-asphalt-500">Where problems are being reported across the city.</p>
        </div>
        <div className="hidden gap-4 sm:flex">
          {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as Severity[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-xs text-asphalt-600">
              <span className="h-3 w-3 rounded-full" style={{ background: SEVERITY_COLOR[s] }} />
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-xl border border-asphalt-200 shadow-card">
        <MapContainer center={center} zoom={complaints.length ? 12 : 4} style={{ height: 560, width: "100%" }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {complaints.map((c) =>
            c.latitude != null && c.longitude != null ? (
              <Marker key={c.id} position={[c.latitude, c.longitude]} icon={pin(c.severity)}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{c.categoryLabel ?? "Unclassified"}</div>
                    <div className="text-asphalt-500">{c.referenceCode}</div>
                    {c.locationAddress && <div className="mt-1">{c.locationAddress}</div>}
                    <a href={`/admin/complaints/${c.id}`} className="mt-2 inline-block font-medium text-sign-600">
                      Open complaint →
                    </a>
                  </div>
                </Popup>
              </Marker>
            ) : null
          )}
        </MapContainer>
      </div>

      {loaded && complaints.length === 0 && !error && (
        <p className="mt-4 text-sm text-asphalt-500">No located complaints to show yet.</p>
      )}
    </AdminLayout>
  );
}
