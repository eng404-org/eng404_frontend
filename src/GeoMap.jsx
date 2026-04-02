import React, { useMemo } from "react";
import { MapContainer, TileLayer, Popup, CircleMarker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

// Configuration constants

const MAP_CENTER = [39.5, -98.35];
const MAP_ZOOM = 4;

// State marker styling configurations
const SELECTED_STATE_MARKER = {
  radius: 10,
  weight: 3,
  color: "#1d4ed8",
  fillColor: "#3b82f6",
  fillOpacity: 0.9,
};

const UNSELECTED_STATE_MARKER = {
  radius: 7,
  weight: 1,
  color: "#64748b",
  fillColor: "#94a3b8",
  fillOpacity: 0.9,
};

const STATE_COORDS = {
  NY: [42.165726, -74.948051],
  CA: [36.116203, -119.681564],
  TX: [31.054487, -97.563461],
  FL: [27.766279, -81.686783],
  IL: [40.349457, -88.986137],
  PA: [40.590752, -77.209755],
  GA: [33.040619, -83.643074],
  DC: [38.9072, -77.0369],
  MA: [42.230171, -71.530106],
  AZ: [33.729759, -111.431221],
  MI: [43.326618, -84.536095],
  WA: [47.400902, -121.490494],
  MN: [45.694454, -93.900192],
  CO: [39.059811, -105.311104],
  NV: [38.313515, -117.055374],
  MD: [39.063946, -76.802101],
  MO: [38.456085, -92.288368],
  OR: [44.572021, -122.070938],
  PR: [18.2208, -66.5901],
  IN: [39.849426, -86.258278],
  OH: [40.388783, -82.764915],
  NC: [35.630066, -79.806419],
  VA: [37.769337, -78.169968],
  RI: [41.680893, -71.511780],
  WI: [44.268543, -89.616508],
  TN: [35.747845, -86.692345],
  UT: [40.150032, -111.862434],
  OK: [35.565342, -96.928917],
  CT: [41.597782, -72.755371],
};

function FlyToSelectedState({ selectedState }) {
  const map = useMap();

  React.useEffect(() => {
    const coords = STATE_COORDS[selectedState];
    if (coords) {
      map.flyTo(coords, 6, { duration: 1.2 });
    }
  }, [selectedState, map]);

  return null;
}

export default function GeoMap({ selectedState, cities = [], states = [], onStateSelect }) {
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
      <h2 className="card-title">City Distribution Map</h2>
      <p className="muted">
        Auto-loads top NY cities and groups nearby markers.
      </p>

      <div style={{ height: 420, borderRadius: 12, overflow: "hidden" }}>
        <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

        <FlyToSelectedState selectedState={selectedState} />

        {states.map((state) => {
          const coords = STATE_COORDS[state.code];
          if (!coords) return null;

          return (
            <CircleMarker
              key={state.code}
              center={coords}
              radius={
                selectedState === state.code
                  ? SELECTED_STATE_MARKER.radius
                  : UNSELECTED_STATE_MARKER.radius
              }
              pathOptions={
                selectedState === state.code
                  ? SELECTED_STATE_MARKER
                  : UNSELECTED_STATE_MARKER
              }
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
          );
        })}

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
