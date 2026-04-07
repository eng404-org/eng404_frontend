import React, { useMemo, useState, useEffect, useCallback } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css";
import GeoMap from "./GeoMap";
import HelloHealthCard from "./HelloHealthCard";
import CityComparison from "./CityComparison";
import { useDropdownOptions, transformSelectOptions } from "./useDropdownOptions";

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

function IntroFeatureCard({ title, text }) {
  return (
    <div className="intro-feature-card">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export default function App() {
  const [lastTouched, setLastTouched] = useState({ states: null, cities: null });

  const [selectedCities, setSelectedCities] = useState([]);

  const [activeTab, setActiveTab] = useState("intro");

  const toggleSelectCity = useCallback((city) => {
    setSelectedCities((prev) => {
      const exists = prev.find((c) => c.name === city.name);
      if (exists) {
        return prev.filter((c) => c.name !== city.name);
      }
      return prev.length < 3 ? [...prev, city] : prev;
    });
  }, []);

  const removeSelectedCity = useCallback((cityName) => {
    setSelectedCities((prev) => prev.filter((c) => c.name !== cityName));
  }, []);

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

  const [loadingStates, setLoadingStates] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [stateSortDir, setStateSortDir] = useState("asc");
  const [loadingCities, setLoadingCities] = useState(false);

  const [globalError, setGlobalError] = useState(null);

  const [stateOptions, setStateOptions] = useState([]);

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
    setConnectionStatus({ ok: null, base: cleaned, latency: null, message: "Testing connection..." });
    try {
      await fetchJson(cleaned, "/hello");
      const latency = Math.round(performance.now() - started);
      setApiBase(cleaned);
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
    loadStates();
  }, [loadStates]);
  

  
  useEffect(() => {
      loadCities();
    }, [loadCities]);

  // Load state options from HATEOAS endpoint
  const { options: stateOptionsRaw } = 
    useDropdownOptions(apiBase, "/state/options");

  useEffect(() => {
    if (Array.isArray(stateOptionsRaw) && stateOptionsRaw.length > 0) {
      const options = transformSelectOptions(stateOptionsRaw, "code", "name");
      setStateOptions(options);
      
      if (options.length > 0 && !stateCode) {
        setStateCode(options[0].value);
      }
    }
  }, [stateOptionsRaw, stateCode]);

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

  const stateList = useMemo(() => {
    const raw = statesResp?.States || statesResp?.states || statesResp;
    if (!raw || typeof raw !== "object") return [];
    if (Array.isArray(raw)) {
      return raw.map((s) => ({
        code: s.code || s.state_code || s.abbr || s["state_code"],
        name: s.name || s.state || s["State"],
      })).filter((s) => s.code || s.name);
    }

    return Object.entries(raw).map(([code, name]) => ({ code, name }));
  }, [statesResp]);

  const filteredStates = useMemo(() => {
    const q = stateSearch.trim().toLowerCase();
    const list = [...stateList];
    list.sort((a, b) => {
      const aName = String(a.name || a.code || "");
      const bName = String(b.name || b.code || "");
      return stateSortDir === "desc"
        ? bName.localeCompare(aName)
        : aName.localeCompare(bName);
    });
    if (!q) return list;
    return list.filter((s) =>
      String(s.name || "").toLowerCase().includes(q) ||
      String(s.code || "").toLowerCase().includes(q)
    );
  }, [stateList, stateSearch, stateSortDir]);

  return (
    <div className="app-shell">
      {globalError && (
        <div className="error-banner">
          {globalError}
        </div>
      )}
  
  <header className="topbar">
  <div className="topbar-left">
    <div className="hero-badge">ENG404</div>
    <h1 className="topbar-title">US Geography API</h1>
  </div>

  <div className="tabs">
    <button
      className={`tab-btn ${activeTab === "intro" ? "active" : ""}`}
      onClick={() => setActiveTab("intro")}
    >
      Intro
    </button>
    <button
      className={`tab-btn ${activeTab === "health" ? "active" : ""}`}
      onClick={() => setActiveTab("health")}
    >
      Health
    </button>
    <button
      className={`tab-btn ${activeTab === "explorer" ? "active" : ""}`}
      onClick={() => setActiveTab("explorer")}
    >
      Explorer
    </button>
  </div>
</header>
  
      {activeTab === "intro" && (
        <section className="tab-page">
          <section className="intro-section">
            <div>
              <h2 className="hero-title">Welcome to the ENG404 geography dashboard</h2>
              <p className="hero-copy">
                This frontend lets you check server status, browse state records, search cities,
                view geographic data on a map, and compare selected cities.
              </p>
  
              <div className="hero-actions intro-pills">
                <span className="pill">Active base: {apiBase}</span>
                <span className="pill pill-quiet">3 endpoints wired</span>
              </div>
  
              <div className="intro-action-row">
                <button className="btn" onClick={() => setActiveTab("health")}>
                  Go to Server Health
                </button>
                <button className="btn btn-ghost" onClick={() => setActiveTab("explorer")}>
                  Open Data Explorer
                </button>
              </div>
            </div>
  
            <div className="intro-feature-grid">
              <IntroFeatureCard
                title="Server Health"
                text="Test backend availability, measure latency, and verify your API base."
              />
              <IntroFeatureCard
                title="Map + State Catalog"
                text="Click state markers, browse records, and inspect data from the backend."
              />
              <IntroFeatureCard
                title="City Search + Compare"
                text="Search by state, filter results, and compare up to three cities."
              />
            </div>
          </section>
        </section>
      )}
  
      {activeTab === "health" && (
        <section className="tab-page">
          <div className="hero">
            <div>
              <div className="hero-badge">Backend connection</div>
              <h2 className="hero-title">Server health and API base</h2>
              <p className="hero-copy">
                Use this page to test the backend connection, change the API base,
                and verify that the app is talking to the correct server.
              </p>
            </div>
  
            <div className="hero-card">
              <p className="muted">Connection settings</p>
  
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
                      connectionStatus.ok === true
                        ? "ok"
                        : connectionStatus.ok === false
                        ? "bad"
                        : ""
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
          </div>
  
          <HelloHealthCard apiBase={apiBase} />
        </section>
      )}
  
      {activeTab === "explorer" && (
        <section className="tab-page">
          <div className="meta-bar">
            <span className="meta-chip">
              <span className="chip-label">/state/read</span>
              <span>{formatTimestamp(lastTouched.states)}</span>
            </span>
            <span className="meta-chip">
              <span className="chip-label">/cities</span>
              <span>{formatTimestamp(lastTouched.cities)}</span>
            </span>
          </div>
  
          <div className="explorer-map-section">
            <GeoMap
              selectedState={selectedMapState}
              cities={mapCities}
              states={stateList}
              onStateSelect={loadCitiesForMapState}
            />
  
            <div className="selected-state-panel card">
              <div className="selected-state-title">
                {selectedMapState ? `Selected state: ${selectedMapState}` : "Selected state: none"}
              </div>
  
              {!selectedMapState && (
                <p className="map-helper-text">
                  Click a state marker to load cities on the map.
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
  
          <div className="explorer-bottom-grid">
            <Card
              title="State Catalog"
              subtitle="Browse all available states from the backend"
              meta={formatTimestamp(lastTouched.states)}
            >
              <div className="card-toolbar">
                <div className="endpoint-chip">GET /state/read</div>
                <div className="toolbar-actions">
                  <div className="control control-wide">
                    <span className="label">Filter</span>
                    <input
                      className="input"
                      value={stateSearch}
                      onChange={(e) => setStateSearch(e.target.value)}
                      placeholder="Search name or code"
                    />
                  </div>
  
                  <div className="control control-mid">
                    <span className="label">Sort</span>
                    <select
                      className="input"
                      value={stateSortDir}
                      onChange={(e) => setStateSortDir(e.target.value)}
                    >
                      <option value="asc">A → Z</option>
                      <option value="desc">Z → A</option>
                    </select>
                  </div>
  
                  <button className="btn" onClick={loadStates} disabled={loadingStates}>
                    {loadingStates ? "Loading..." : "Load states"}
                  </button>
                </div>
              </div>
  
              {statesErr && <p className="path error-text">{statesErr}</p>}
              {loadingStates && <p className="path">Contacting backend...</p>}
  
              {!loadingStates && !statesResp && !statesErr && (
                <p className="path">No states loaded yet. Press “Load states” to pull the catalog.</p>
              )}
  
              {statesResp && (
                <>
                  <p className="meta">
                    Total states: <b>{stateList.length || statesResp["Number of Records"] || 0}</b>
                    {stateSearch.trim() && (
                      <span style={{ marginLeft: 8, color: "var(--ink-500)" }}>
                        ({filteredStates.length} match{filteredStates.length === 1 ? "" : "es"})
                      </span>
                    )}
                  </p>
  
                  <div className="card-subsection panel-soft">
                    {filteredStates.length === 0 ? (
                      <p className="path">No states match that search.</p>
                    ) : (
                      <div className="scroll-box">
                        <ul className="list" aria-label="state list" style={{ margin: 0 }}>
                          {filteredStates.map((state) => {
                            const isSelected = stateCode === state.code;
                            return (
                              <li
                                key={state.code || state.name}
                                className={`city-item list-item-selectable ${isSelected ? "active" : ""}`}
                                onClick={() => {
                                  if (state.code) setStateCode(state.code);
                                  setSelectedMapState(state.code || null);
                                }}
                              >
                                <div className="city-name">
                                  {state.name || state.code}
                                </div>
                                <div className="city-meta">
                                  {state.code || "—"}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}
            </Card>
  
            <Card
              title="City Search"
              subtitle="Find cities by state, limit, and search term"
              meta={formatTimestamp(lastTouched.cities)}
            >
              <div className="controls">
                <label className="control">
                  <span className="label">state_code</span>
                  <select
                    className="input"
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                  >
                    <option value="">Select a state</option>
                    {stateOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
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
                    aria-label="city sort"
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value)}
                  >
                    <option value="asc">A → Z</option>
                    <option value="desc">Z → A</option>
                  </select>
                </label>
  
                <div className="control-group">
                  <button className="btn" onClick={loadCities} disabled={loadingCities}>
                    {loadingCities ? "Loading..." : "Search cities"}
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
                    {visibleCities.map((c, idx) => {
                      const links = Array.isArray(c.links) ? c.links : [];
                      const isSelected = selectedCities.some((sc) => sc.name === c.name);
  
                      return (
                        <li key={idx} className="city-item">
                          <div className="city-name">{c.name}</div>
                          <div className="city-meta">{c.state_code}</div>
  
                          {links.length > 0 && (
                            <div className="city-links">
                              {links.map((l, i) => (
                                <span key={i} className="endpoint-chip muted">
                                  {l.rel}: {l.href}
                                </span>
                              ))}
                            </div>
                          )}
  
                          <div style={{ marginTop: 8 }}>
                            <button
                              className={`btn compare-btn ${isSelected ? "active" : "inactive"}`}
                              onClick={() => toggleSelectCity(c)}
                            >
                              {isSelected ? "✓ Compare" : "Compare"}
                              {selectedCities.length >= 3 && !isSelected && " (max 3)"}
                            </button>
                          </div>
                        </li>
                      );
                    })}
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
  
          {selectedCities.length > 0 && (
            <div className="compare-section">
              <CityComparison cities={selectedCities} onRemoveCity={removeSelectedCity} />
            </div>
          )}
        </section>
      )}
    </div>

  )};