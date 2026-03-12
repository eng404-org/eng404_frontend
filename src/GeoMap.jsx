// import React, { useEffect, useMemo, useState } from "react";
import React, { useMemo } from "react";
// import { MapContainer, TileLayer, Popup, CircleMarker } from "react-leaflet";
import { MapContainer, TileLayer, Popup, CircleMarker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

// Configuration constants
// const DEFAULT_STATE_CODE = "NY";
// const DEFAULT_CITY_LIMIT = 200;
const MAP_CENTER = [39.5, -98.35];
const MAP_ZOOM = 4;

const STATE_MARKERS = [
  { code: "NY", name: "New York", lat: 42.9, lng: -75.5 },
  { code: "CA", name: "California", lat: 37.25, lng: -119.75 },
  { code: "TX", name: "Texas", lat: 31.0, lng: -99.0 },
  { code: "FL", name: "Florida", lat: 27.8, lng: -81.7 },
  { code: "IL", name: "Illinois", lat: 40.0, lng: -89.2 }
];

function FlyToSelectedState({ selectedState }) {
  const map = useMap();

  React.useEffect(() => {
    const state = STATE_MARKERS.find((s) => s.code === selectedState);
    if (state) {
      map.flyTo([state.lat, state.lng], 6, { duration: 1.2 });
    }
  }, [selectedState, map]);

  return null;
}

export default function GeoMap({ selectedState, cities = [], onStateSelect }) {
  const points = useMemo(() => {
    return Array.isArray(cities)
      ? cities
          .map((c) => {
            const lat = c.lat ?? c.latitude;
            const lng = c.lng ?? c.longitude;
  
            return {
              name: c.name ?? "Unknown",
              state: c.state_code ?? "",
              lat,
              lng,
              value: c.population ?? 1,
            };
          })
          .filter((c) => typeof c.lat === "number" && typeof c.lng === "number")
      : [];
  }, [cities]);
  
  const radiusFor = useMemo(() => {
    return (v) => {
      const n = Number(v) || 1;
      return Math.max(4, Math.min(18, Math.sqrt(n) / 50));
    };
  }, []);

  return (
    <div className="card">
      <h2 className="card-title">Geographic Map</h2>
      <p className="muted">
        Selected state: {selectedState || "none"} | Cities plotted: {points.length}
      </p>

      <div style={{ height: 420, borderRadius: 12, overflow: "hidden" }}>
        <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

        <FlyToSelectedState selectedState={selectedState} />

        {STATE_MARKERS.map((state) => (
          <CircleMarker
            key={state.code}
            center={[state.lat, state.lng]}
            radius={selectedState === state.code ? 10 : 7}
            pathOptions={{
              weight: selectedState === state.code ? 3 : 1,
              color: selectedState === state.code ? "#1d4ed8" : "#64748b",
              fillColor: selectedState === state.code ? "#3b82f6" : "#94a3b8",
              fillOpacity: 0.9
            }}
            eventHandlers={{
              click: () => onStateSelect && onStateSelect(state.code)
            }}
          >
            <Popup>
              <div>
                <strong>{state.name}</strong>
                <br />
                State code: {state.code}
                <br />
                Click to load cities
              </div>
            </Popup>
          </CircleMarker>
        ))}

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
                  <div>Population: {p.value}</div>
                </Popup>
              </CircleMarker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  );
}
