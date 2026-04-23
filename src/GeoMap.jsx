import React, { useMemo } from "react";
import { MapContainer, TileLayer, Popup, CircleMarker, useMap, Tooltip } from "react-leaflet";
// import MarkerClusterGroup from "react-leaflet-cluster";

// Configuration constants

const MAP_CENTER = [39.5, -98.35];
const MAP_ZOOM = 4;
const CITY_VISIBLE_ZOOM = 7;

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


const CITY_MARKER_STYLE = {
  color: "#1d4ed8",
  fillColor: "#3b82f6",
  fillOpacity: 0.75,
  weight: 1,
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

const STATE_VIEW = {
  RI: { center: [41.680893, -71.511780], zoom: 9 },
  CT: { center: [41.597782, -72.755371], zoom: 8 },
  NJ: { center: [40.298904, -74.521011], zoom: 8 },
  MA: { center: [42.230171, -71.530106], zoom: 7 },
  NY: { center: [42.165726, -74.948051], zoom: 7 },
  default: { zoom: 7 }
};

function MapZoomWatcher({ onZoomChange }) {
  const map = useMap();

  React.useEffect(() => {
    const updateZoom = () => onZoomChange(map.getZoom());

    updateZoom();
    map.on("zoomend", updateZoom);

    return () => {
      map.off("zoomend", updateZoom);
    };
  }, [map, onZoomChange]);

  return null;
}

function FlyToSelectedState({ selectedState }) {
  const map = useMap();

  React.useEffect(() => {
    if (!selectedState) return;

    const coords = STATE_COORDS[selectedState];
    if (!coords) return;

    const view = STATE_VIEW[selectedState];
    const center = view?.center ?? coords;
    const zoom = view?.zoom ?? STATE_VIEW.default.zoom;

    map.flyTo(center, zoom, { duration: 1.2 });
  }, [selectedState, map]);

  return null;
}

function CityMarkers({ points, radiusFor }) {
  return (
    <>
      {points.map((p, i) => (
        <CircleMarker
          key={`${p.name}-${p.state}-${i}`}
          center={[p.lat, p.lng]}
          radius={radiusFor(p.population)}
          pathOptions={CITY_MARKER_STYLE}
          eventHandlers={{
            mouseover: (e) => e.target.openTooltip(),
            mouseout: (e) => e.target.closeTooltip(),
          }}
        >
          <Tooltip direction="top" offset={[0, -4]} opacity={1}>
            <div>
              <strong>{p.name}</strong>
              <br />
              State: {p.state}
              <br />
              Population: {p.population}
              <br />
              Latitude: {p.lat}
              <br />
              Longitude: {p.lng}
            </div>
          </Tooltip>

          <Popup>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{p.name}</div>
              <div>State: {p.state}</div>
              <div>Population: {p.population}</div>
              <div>Latitude: {p.lat}</div>
              <div>Longitude: {p.lng}</div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

function StateMarkers({ states, selectedState, onStateSelect }) {
  const map = useMap();

  const handleStateClick = (state) => {
    const coords = STATE_COORDS[state.code];
    if (!coords) return;

    const view = STATE_VIEW[state.code];
    const center = view?.center ?? coords;
    const zoom = view?.zoom ?? STATE_VIEW.default.zoom;

    map.setView(center, zoom, { animate: true });

    if (onStateSelect) {
      onStateSelect(state.code);
    }
  };

  return (
    <>
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
              click: () => handleStateClick(state),
              mouseover: (e) => e.target.openTooltip(),
              mouseout: (e) => e.target.closeTooltip(),
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={1}>
              <div>
                <strong>{state.name}</strong>
                <br />
                State code: {state.code}
                <br />
                Click to load cities
              </div>
            </Tooltip>

            <Popup>
              <div
                onClick={() => handleStateClick(state)}
                style={{ cursor: "pointer" }}
              >
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
    </>
  );
}

export default function GeoMap({ selectedState, cities = [], states = [], onStateSelect }) {
  const [zoom, setZoom] = React.useState(MAP_ZOOM);

  const points = useMemo(() => {
    return Array.isArray(cities)
      ? cities
          .map((c) => {
            const lat = Number(c.lat ?? c.latitude);
            const lng = Number(c.lng ?? c.longitude);
  
            return {
              name: c.name ?? "Unknown",
              state: c.state_code ?? c.state ?? "",
              lat,
              lng,
              population: Number(c.population ?? 1),
            };
          })
          .filter((c) => !Number.isNaN(c.lat) && !Number.isNaN(c.lng))
      : [];
  }, [cities]);

  const radiusFor = useMemo(() => {
    return (v) => {
      const n = Number(v) || 1;
      return Math.max(4, Math.min(12, Math.sqrt(n) / 120));
    };
  }, []);

  const showCities = Boolean(selectedState) && zoom >= CITY_VISIBLE_ZOOM && points.length > 0;

  console.log("selectedState:", selectedState, "cities:", cities, "points:", points);

  return (
    <div className="card">
      <h2 className="card-title">City Distribution Map</h2>
      <p className="muted">
        Click a state dot to load cities. Zoom in to reveal city markers and hover for details.
      </p>

      <div style={{ height: 600, borderRadius: 12, overflow: "hidden" }}>
        <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapZoomWatcher onZoomChange={setZoom} />
          <FlyToSelectedState selectedState={selectedState} />

          <StateMarkers
            states={states}
            selectedState={selectedState}
            onStateSelect={onStateSelect}
          />
          {showCities && <CityMarkers points={points} radiusFor={radiusFor} />}
        </MapContainer>
      </div>
    </div>
  );
}