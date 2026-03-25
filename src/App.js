import React, { useMemo, useState, useEffect, useCallback } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css";
import GeoMap from "./GeoMap";
import HelloHealthCard from "./HelloHealthCard";

const DEFAULT_API_URL =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  "http://localhost:8000";

const STORAGE_KEY = "eng404_api_base";

const DEFAULT_STATE_CODE = "NY";
const DEFAULT_LIMIT = "10";

// Error messages
const ERROR_MESSAGES = {
  FETCH_ERROR: "Error when fetching data.",
  DEFAULT_STATE: DEFAULT_STATE_CODE,
  DEFAULT_LIMIT: DEFAULT_LIMIT,
};

const normalizeBase = (value) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return DEFAULT_API_URL.replace(/\/+$/, "");
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
};

async function fetchJson(base, path) {
  const cleanBase = normalizeBase(base);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${cleanBase}${cleanPath}`;
  const res = await fetch(url);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

function Card({ title, subtitle, meta, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          {subtitle && <p className="card-eyebrow">{subtitle}</p>}
          <h2 className="card-title">{title}</h2>
        </div>
        {meta && <span className="card-meta">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

function JsonBox({ value }) {
  return (
    <pre className="json">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function App() {
  const [lastTouched, setLastTouched] = useState({ hello: null, states: null, cities: null });

  const readStoredBase = useCallback(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  }, []);

  const initialBase = useMemo(
    () => normalizeBase(readStoredBase() || DEFAULT_API_URL),
    [readStoredBase]
  );

  const [apiBase, setApiBase] = useState(initialBase);
  const [apiBaseDraft, setApiBaseDraft] = useState(initialBase);
  const [connectionStatus, setConnectionStatus] = useState({ ok: null, base: null, latency: null, message: "" });

  // Endpoint 1: /hello
  // eslint-disable-next-line no-unused-vars
  const [hello, setHello] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [helloErr, setHelloErr] = useState(null);

  // Endpoint 2: /state/read
  const [statesResp, setStatesResp] = useState(null);
  const [statesErr, setStatesErr] = useState(null);

  // Endpoint 3: /cities (with query params)
  const [stateCode, setStateCode] = useState(DEFAULT_STATE_CODE);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [cities, setCities] = useState(null);
  const [citiesErr, setCitiesErr] = useState(null);
  const [cityQuery, setCityQuery] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [visibleCount, setVisibleCount] = useState(10);
  const [testingBase, setTestingBase] = useState(false);

  const [selectedMapState, setSelectedMapState] = useState(null);
  const [mapCities, setMapCities] = useState([]);
  const [loadingMapCities, setLoadingMapCities] = useState(false);
  const [mapCitiesErr, setMapCitiesErr] = useState(null);

  // eslint-disable-next-line no-unused-vars
  const [loadingHello, setLoadingHello] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [globalError, setGlobalError] = useState(null);

  const citiesPath = useMemo(() => {
    const params = new URLSearchParams();
    if (stateCode.trim()) params.set("state_code", stateCode.trim());
    const n = Number(limit);
    if (Number.isFinite(n) && n > 0) {
      params.set("limit", String(n));
    }
    return `/cities?${params.toString()}`;
  }, [stateCode, limit]);

  const formatTimestamp = useCallback((date) => {
    if (!date) return "Not fetched yet";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }, []);

  const testAndApplyBase = useCallback(async () => {
    const cleaned = normalizeBase(apiBaseDraft);
    const started = performance.now();
    setTestingBase(true);
    setConnectionStatus({ ok: null, base: cleaned, latency: null, message: "Pinging /hello..." });
    try {
      const resp = await fetchJson(cleaned, "/hello");
      const latency = Math.round(performance.now() - started);
      setApiBase(cleaned);
      setHello(resp);
      setLastTouched((prev) => ({ ...prev, hello: new Date() }));
      setConnectionStatus({ ok: true, base: cleaned, latency, message: "Connected" });
    } catch (e) {
      const latency = Math.round(performance.now() - started);
      setConnectionStatus({ ok: false, base: cleaned, latency, message: e.message });
    } finally {
      setTestingBase(false);
    }
  }, [apiBaseDraft]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, apiBase);
    } catch {
      // ignore persistence errors (e.g., private mode)
    }
  }, [apiBase]);

  const loadHello = useCallback(async () => {
    setGlobalError(null);
    setLoadingHello(true);
    setHelloErr(null);
    try {
      setHello(await fetchJson(apiBase, "/hello"));
      setLastTouched((prev) => ({ ...prev, hello: new Date() }));
    } catch (e) {
      setHelloErr(e.message);
      setGlobalError(ERROR_MESSAGES.FETCH_ERROR);
    } finally {
    setLoadingHello(false);
    }
  }, [apiBase]);

  const loadStates = useCallback(async () => {
    setGlobalError(null);
    setLoadingStates(true);
    setStatesErr(null);
    try {
      setStatesResp(await fetchJson(apiBase, "/state/read"));
      setLastTouched((prev) => ({ ...prev, states: new Date() }));
    } catch (e) {
      setStatesErr(e.message);
      setGlobalError(ERROR_MESSAGES.FETCH_ERROR);
    } finally {
    setLoadingStates(false);
    }
  }, [apiBase]);

  const loadCities = useCallback(async () => {
    setGlobalError(null);
    setLoadingCities(true);
    setCitiesErr(null);
  
    try {
      const data = await fetchJson(apiBase, citiesPath);
      const results = Array.isArray(data) ? data : data?.cities || data?.results || [];
  
      setCities(data);
      setMapCities(results);
  
      const code = stateCode.trim().toUpperCase();
      if (code) {
        setSelectedMapState(code);
      }
  
      setVisibleCount(10);
      setLastTouched((prev) => ({ ...prev, cities: new Date() }));
    } catch (e) {
      setCitiesErr(e.message);
      setGlobalError(ERROR_MESSAGES.FETCH_ERROR);
    } finally {
      setLoadingCities(false);
    }
  }, [apiBase, citiesPath, stateCode]);

  
  const loadCitiesForMapState = useCallback(async (stateCodeFromMap) => {
    if (!stateCodeFromMap) return;
  
    setGlobalError(null);
    setLoadingMapCities(true);
    setMapCitiesErr(null);
    setSelectedMapState(stateCodeFromMap);
    setStateCode(stateCodeFromMap);
    setCitiesErr(null);
  
    try {
      const path = `/cities?state_code=${encodeURIComponent(stateCodeFromMap)}&limit=20`;
      const data = await fetchJson(apiBase, path);
      const results = Array.isArray(data) ? data : data?.cities || data?.results || [];
      setMapCities(results);
      setCities(results);
      setVisibleCount(10);
      setLimit("20");
      setCityQuery("");
  
      setLastTouched((prev) => ({ ...prev, cities: new Date() }));
    } catch (e) {
      setMapCities([]);
      setMapCitiesErr(e.message);
      setGlobalError("Error while fetching map-selected cities.");
    } finally {
      setLoadingMapCities(false);
    }
  }, [apiBase]);

  useEffect(() => {
    loadHello();
  }, [loadHello]);

  useEffect(() => {
  loadCities();
  }, [loadCities]);

  const citiesArray = Array.isArray(cities)
  ? cities
  : cities?.cities || cities?.results;

  const filteredCities = useMemo(() => {
    if (!Array.isArray(citiesArray)) return [];
    const q = cityQuery.trim().toLowerCase();
    return citiesArray.filter((c) =>
      q ? String(c.name || "").toLowerCase().includes(q) : true
    );
  }, [citiesArray, cityQuery]);

  const sortedCities = useMemo(() => {
    const arr = [...filteredCities];
    arr.sort((a, b) => {
      const aName = String(a.name || "");
      const bName = String(b.name || "");
      return sortDir === "desc"
        ? bName.localeCompare(aName)
        : aName.localeCompare(bName);
    });
    return arr;
  }, [filteredCities, sortDir]);

  const visibleCities = useMemo(
    () => sortedCities.slice(0, visibleCount),
    [sortedCities, visibleCount]
  );

  return (
    <div className="app-shell">
      {globalError && (
        <div className="error-banner">
          {globalError}
        </div>
      )}
  
      <header className="hero">
        <div>
          <div className="hero-badge">ENG404 Frontend Demo</div>
          <h1 className="hero-title">API observability at a glance</h1>
          <p className="hero-copy">
            Explore three backend endpoints, map city data, and validate health without leaving this page. Every
            interaction explains what it fetches and when it last ran.
          </p>
          <div className="hero-actions">
            <span className="pill">Active base: {apiBase}</span>
            <span className="pill pill-quiet">3 endpoints wired</span>
            <span className="pill pill-quiet">Leaflet map preview</span>
            <span className="pill pill-quiet">Base saved locally</span>
          </div>
        </div>
  
        <div className="hero-card">
          <p className="muted">How to read this page</p>
          <ul className="hero-list">
            <li><b>Map</b> lets you click a state marker to load and cluster cities.</li>
            <li><b>Health</b> measures latency and shows raw JSON when needed.</li>
            <li><b>States & cities</b> cards reveal payloads with concise previews.</li>
          </ul>
  
          <div className="api-base-panel">
            <label className="label">API base / port</label>
            <div className="api-base-controls">
              <input
                className="input"
                value={apiBaseDraft}
                onChange={(e) => setApiBaseDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") testAndApplyBase();
                }}
                placeholder="http://localhost:8000"
              />
              <button className="btn" onClick={testAndApplyBase} disabled={testingBase}>
                {testingBase ? "Pinging..." : "Apply & ping"}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  const fallback = normalizeBase(DEFAULT_API_URL);
                  setApiBaseDraft(fallback);
                  setApiBase(fallback);
                }}
              >
                Use default
              </button>
            </div>
  
            <div className="connection-row">
              <span
                className={`status-dot ${
                  connectionStatus.ok === true ? "ok" : connectionStatus.ok === false ? "bad" : "idle"
                }`}
              />
              <span className="connection-copy">
                {connectionStatus.ok === null
                  ? "Not tested yet"
                  : connectionStatus.ok
                  ? `Online in ${connectionStatus.latency} ms`
                  : connectionStatus.message || "Offline"}
              </span>
            </div>
  
            <p className="muted">Base URL is remembered locally; refreshes keep your choice.</p>
          </div>
        </div>
      </header>
  
      <div className="meta-bar">
        <span className="meta-chip">
          <span className="chip-label">/hello</span>
          <span>{formatTimestamp(lastTouched.hello)}</span>
        </span>
        <span className="meta-chip">
          <span className="chip-label">/state/read</span>
          <span>{formatTimestamp(lastTouched.states)}</span>
        </span>
        <span className="meta-chip">
          <span className="chip-label">/cities</span>
          <span>{formatTimestamp(lastTouched.cities)}</span>
        </span>
      </div>
  
      <div className="layout-grid">
        <div>
          <GeoMap
            selectedState={selectedMapState}
            cities={mapCities}
            onStateSelect={loadCitiesForMapState}
          />
  
          <div className="selected-state-panel">
            <div className="selected-state-title">
              {selectedMapState ? `Selected state: ${selectedMapState}` : "Selected state: none"}
            </div>
  
            {!selectedMapState && (
              <p className="map-helper-text">
                Click a blue state marker to load cities on the map.
              </p>
            )}
  
            {loadingMapCities && <p className="path">Loading cities from map selection...</p>}
  
            {mapCitiesErr && <p className="path error-text">{mapCitiesErr}</p>}
  
            {!loadingMapCities && !mapCitiesErr && selectedMapState && (
              <p className="path">
                Loaded <b>{mapCities.length}</b> cities for <b>{selectedMapState}</b>.
              </p>
            )}
          </div>
        </div>
  
        <Card
          title="3) GET /cities (query params)"
          subtitle="Filter cities by state and limit"
          meta={formatTimestamp(lastTouched.cities)}
        >
          <div className="controls">
            <label className="control">
              <span className="label">state_code</span>
              <input
                className="input"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                placeholder="NY"
              />
            </label>
  
            <label className="control">
              <span className="label">limit</span>
              <input
                className="input"
                type="number"
                min="1"
                max="200"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
            </label>
  
            <label className="control">
              <span className="label">search</span>
              <input
                className="input"
                value={cityQuery}
                onChange={(e) => {
                  setCityQuery(e.target.value);
                  setVisibleCount(10);
                }}
                placeholder="e.g. York"
              />
            </label>
  
            <label className="control">
              <span className="label">sort</span>
              <select
                className="input"
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value)}
              >
                <option value="asc">A → Z</option>
                <option value="desc">Z → A</option>
              </select>
            </label>
  
            <div className="control-group">
              <button className="btn" onClick={loadCities} disabled={loadingCities}>
                {loadingCities ? "Loading..." : "Run query"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setCities(null);
                  setCitiesErr(null);
                  setStateCode(DEFAULT_STATE_CODE);
                  setLimit(DEFAULT_LIMIT);
                  setCityQuery("");
                  setSortDir("asc");
                  setVisibleCount(10);
                }}
              >
                Clear
              </button>
            </div>
          </div>
  
          <div className="path-row">
            <span className="endpoint-chip muted">Path: {citiesPath}</span>
            <span className="muted">Auto-loads on mount with NY & limit 10.</span>
          </div>
  
          {citiesErr && <p className="path error-text">{citiesErr}</p>}
  
          {loadingCities && <p className="path">Crunching results...</p>}
  
          {Array.isArray(citiesArray) && (
            <>
              <p className="meta">
                Results: <b>{filteredCities.length}</b> (showing {visibleCities.length})
              </p>
  
              <ul className="list">
                {visibleCities.map((c, idx) => (
                  <li key={idx} className="city-item">
                    <div className="city-name">{c.name}</div>
                    <div className="city-meta">{c.state_code}</div>
                  </li>
                ))}
              </ul>
  
              {visibleCities.length < filteredCities.length && (
                <button
                  className="btn"
                  onClick={() => setVisibleCount((n) => n + 10)}
                >
                  Load more
                </button>
              )}
            </>
          )}
  
          {cities && !Array.isArray(cities) && <JsonBox value={cities} />}
        </Card>
      </div>
  
      <HelloHealthCard apiBase={apiBase} />
  
      <Card
        title="2) GET /state/read"
        subtitle="Full state catalog"
        meta={formatTimestamp(lastTouched.states)}
      >
        <div className="card-toolbar">
          <div className="endpoint-chip">GET /state/read</div>
          <button className="btn" onClick={loadStates} disabled={loadingStates}>
            {loadingStates ? "Loading..." : "Refresh"}
          </button>
        </div>
  
        {statesErr && <p className="path error-text">{statesErr}</p>}
  
        {loadingStates && <p className="path">Contacting backend...</p>}
  
        {statesResp && (
          <>
            <p className="meta">Records available: <b>{statesResp["Number of Records"]}</b></p>
  
            <div className="card-subsection">
              <p className="muted">Preview (first 10 to keep things tidy)</p>
              <JsonBox
                value={{
                  "States Preview":
                    Array.isArray(statesResp["States"])
                      ? statesResp["States"].slice(0, 10)
                      : Object.fromEntries(Object.entries(statesResp["States"] || {}).slice(0, 10)),
                }}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
              }