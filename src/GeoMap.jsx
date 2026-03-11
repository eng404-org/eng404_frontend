import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Popup, CircleMarker } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

// Configuration constants
const DEFAULT_STATE_CODE = "NY";
const DEFAULT_CITY_LIMIT = 200;
const MAP_CENTER = [39.5, -98.35];
const MAP_ZOOM = 4;

const buildUrl = (base, path) => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const trimmedBase = (base || "").trim();
  if (!trimmedBase) return cleanPath;
  return `${trimmedBase.replace(/\/+$/, "")}${cleanPath}`;
};

async function fetchJson(base, path) {
  const res = await fetch(buildUrl(base, path));
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  return data;
}

export default function GeoMap({ apiBase = "" }) {
  const [points, setPoints] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");

      try {
        const data = await fetchJson(apiBase, `/cities?state_code=${DEFAULT_STATE_CODE}&limit=${DEFAULT_CITY_LIMIT}`);

        const cleaned = Array.isArray(data)
          ? data
              .filter((c) => typeof c.lat === "number" && typeof c.lng === "number")
              .map((c) => ({
                name: c.name ?? "Unknown",
                state: c.state_code ?? "",
                lat: c.lat,
                lng: c.lng,
                value: c.population ?? 1,
              }))
          : [];

        if (!cancelled) setPoints(cleaned);
      } catch (e) {
        if (!cancelled) setError(String(e.message || e));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  const radiusFor = useMemo(() => {
    return (v) => {
      const n = Number(v) || 1;
      return Math.max(4, Math.min(18, Math.sqrt(n) / 50));
    };
  }, []);

  return (
    <div className="card">
      <h2 className="card-title">Geographic Map</h2>

      {error ? <div className="error">Map data error: {error}</div> : null}

      <div style={{ height: 420, borderRadius: 12, overflow: "hidden" }}>
        <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MarkerClusterGroup chunkedLoading>
            {points.map((p, i) => (
              <CircleMarker
                key={`${p.name}-${p.state}-${i}`}
                center={[p.lat, p.lng]}
                radius={radiusFor(p.value)}
              >
                <Popup>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div>{p.state}</div>
                  <div>Value: {p.value}</div>
                </Popup>
              </CircleMarker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  );
}
