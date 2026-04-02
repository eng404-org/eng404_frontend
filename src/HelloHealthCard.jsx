import React, { useMemo, useState } from "react";

const DEFAULT_API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Error box styling
const ERROR_BOX_STYLE = {
  padding: 12,
  borderRadius: 10,
  background: "rgba(239,68,68,0.10)",
  border: "1px solid rgba(239,68,68,0.25)",
  color: "rgba(127,29,29,1)",
  fontSize: 14,
};

// Health badge styling
const HEALTH_BADGE_STYLE = {
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 12,
  border: "1px solid rgba(0,0,0,0.08)",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  letterSpacing: "0.01em",
};

const HEALTH_STATUS_META = {
  idle: {
    label: "Idle",
    icon: "•",
    tone: "rgba(148,163,184,0.20)",
    textColor: "#475569",
  },
  checking: {
    label: "In progress",
    icon: "⏳",
    tone: "rgba(59,130,246,0.14)",
    textColor: "#1d4ed8",
  },
  online: {
    label: "✅ Online",
    icon: "✅",
    tone: "rgba(34,197,94,0.12)",
    textColor: "#166534",
  },
  offline: {
    label: "❌ Offline",
    icon: "❌",
    tone: "rgba(239,68,68,0.12)",
    textColor: "#991b1b",
  },
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
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text}`);
  return data;
}

function HealthBadge({ status, latencyMs }) {
  const meta = HEALTH_STATUS_META[status] || HEALTH_STATUS_META.idle;
  return (
    <span
      style={{
        ...HEALTH_BADGE_STYLE,
        background: meta.tone,
        color: meta.textColor,
      }}
    >
      {meta.label}
      {status === "online" && latencyMs !== null && (
        <span style={{ opacity: 0.75 }}>• {latencyMs} ms</span>
      )}
    </span>
  );
}

export default function HelloHealthCard({ apiBase = DEFAULT_API_URL }) {
  const cleanBase = useMemo(() => normalizeBase(apiBase), [apiBase]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("idle");
  const [latencyMs, setLatencyMs] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function runCheck() {
    setStatus("checking");
    setLoading(true);
    setError("");
    setData(null);
    setLatencyMs(null);

    const t0 = performance.now();
    try {
      const resp = await fetchJson(cleanBase, "/hello");
      const t1 = performance.now();
      setLatencyMs(Math.round(t1 - t0));
      setCheckedAt(new Date());
      setStatus("online");
      setData(resp);
    } catch (e) {
      const t1 = performance.now();
      setLatencyMs(Math.round(t1 - t0));
      setCheckedAt(new Date());
      setStatus("offline");
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p className="card-eyebrow" style={{ marginBottom: 2 }}>Live observability</p>
          <h2 className="card-title" style={{ margin: 0 }}>Server Health</h2>
        </div>
        <HealthBadge status={status} latencyMs={latencyMs} />
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn" onClick={runCheck} disabled={loading}>
            {loading ? "Checking..." : "Check backend status"}
          </button>
          <button className="btn btn-ghost" onClick={runCheck} disabled={loading}>
            Retry
          </button>

          <span style={{ opacity: 0.75, fontSize: 13 }}>
            API: <code>{cleanBase}</code>
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <InfoCell label="Latency:" value={latencyMs !== null ? `${latencyMs} ms` : "—"} emphasize={latencyMs !== null} />
          <InfoCell label="Status" value={statusLabel(status)} />
          <InfoCell label="Last checked" value={checkedAt ? checkedAt.toLocaleString() : "Not checked yet"} />
          <InfoCell label="Base URL" value={<code>{cleanBase}</code>} />
          <InfoCell
            label="Last error"
            value={error ? "See details below" : "None"}
            muted={!error}
          />
        </div>

        {status === "checking" && (
          <p className="path" style={{ margin: 0 }}>Calling /hello and measuring round-trip...</p>
        )}

        {error && (
          <div style={ERROR_BOX_STYLE}>
            <b>Couldn’t reach the backend.</b>
            <div style={{ marginTop: 6 }}>
              {error}
            </div>
            <div style={{ marginTop: 8, opacity: 0.85 }}>
              Tip: make sure your backend is running and CORS allows <code>localhost:3000</code>.
            </div>
          </div>
        )}

        {data && (
          <details style={{ marginTop: 4 }}>
            <summary style={{ cursor: "pointer", opacity: 0.8 }}>Show raw JSON</summary>
            <pre className="json" style={{ marginTop: 8 }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

function InfoCell({ label, value, emphasize = false, muted = false }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <span className="label" style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 11 }}>
        {label}
      </span>
      <span
        style={{
          fontWeight: emphasize ? 700 : 500,
          color: muted ? "#94a3b8" : "#0f172a",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function statusLabel(status) {
  switch (status) {
    case "checking":
      return "In progress";
    case "online":
      return "Online";
    case "offline":
      return "Offline";
    default:
      return "Idle";
  }
}
