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
  AL: [32.806671, -86.791130],
  AK: [61.370716, -152.404419],
  AZ: [33.729759, -111.431221],
  AR: [34.969704, -92.373123],
  CA: [36.116203, -119.681564],
  CO: [39.059811, -105.311104],
  CT: [41.597782, -72.755371],
  DE: [39.318523, -75.507141],
  DC: [38.907200, -77.036900],
  FL: [27.766279, -81.686783],
  GA: [33.040619, -83.643074],
  HI: [21.094318, -157.498337],
  ID: [44.240459, -114.478828],
  IL: [40.349457, -88.986137],
  IN: [39.849426, -86.258278],
  IA: [42.011539, -93.210526],
  KS: [38.526600, -96.726486],
  KY: [37.668140, -84.670067],
  LA: [31.169546, -91.867805],
  ME: [44.693947, -69.381927],
  MD: [39.063946, -76.802101],
  MA: [42.230171, -71.530106],
  MI: [43.326618, -84.536095],
  MN: [45.694454, -93.900192],
  MS: [32.741646, -89.678696],
  MO: [38.456085, -92.288368],
  MT: [46.921925, -110.454353],
  NE: [41.125370, -98.268082],
  NV: [38.313515, -117.055374],
  NH: [43.452492, -71.563896],
  NJ: [40.298904, -74.521011],
  NM: [34.840515, -106.248482],
  NY: [42.165726, -74.948051],
  NC: [35.630066, -79.806419],
  ND: [47.528912, -99.784012],
  OH: [40.388783, -82.764915],
  OK: [35.565342, -96.928917],
  OR: [44.572021, -122.070938],
  PA: [40.590752, -77.209755],
  PR: [18.220800, -66.590100],
  RI: [41.680893, -71.511780],
  SC: [33.856892, -80.945007],
  SD: [44.299782, -99.438828],
  TN: [35.747845, -86.692345],
  TX: [31.054487, -97.563461],
  UT: [40.150032, -111.862434],
  VT: [44.045876, -72.710686],
  VA: [37.769337, -78.169968],
  WA: [47.400902, -121.490494],
  WV: [38.491226, -80.954453],
  WI: [44.268543, -89.616508],
  WY: [42.755966, -107.302490]
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

      <div style={{ height: 600, borderRadius: 12, overflow: "hidden" }}>
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
