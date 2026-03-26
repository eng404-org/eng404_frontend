import React, { useMemo } from "react";

export default function CityComparison({ cities, onRemoveCity }) {
  const metrics = useMemo(() => {
    if (cities.length === 0) return [];
    const sorted = [...cities].sort((a, b) => (b.population || 0) - (a.population || 0));
    return cities.map(city => ({
      name: city.name,
      state: city.state || city.state_code || "Unknown",
      population: city.population || 0,
      rank: sorted.findIndex(c => c.name === city.name) + 1,
    }));
  }, [cities]);

  if (cities.length === 0) return null;

  const maxPop = Math.max(...metrics.map(m => m.population), 1);
  const totalPop = metrics.reduce((sum, m) => sum + m.population, 0);
  const avgPop = totalPop > 0 ? Math.round(totalPop / metrics.length) : 0;

  const getRankEmoji = (rank) => {
    const emojis = ["🥇", "🥈", "🥉"];
    return emojis[rank - 1] || `#${rank}`;
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="card-title" style={{ margin: 0 }}>
          City Comparison
        </h2>
        <span style={{ fontSize: 12, opacity: 0.6 }}>
          {cities.length} city{cities.length !== 1 ? "ies" : ""} selected
        </span>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {/* Bar Chart Section */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            Population Comparison
          </h3>
          {metrics.map((city) => (
            <div key={city.name} style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, minWidth: 60 }}>{city.name}</span>
                  <span style={{ fontSize: 12, opacity: 0.6 }}>({city.state})</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
                  {getRankEmoji(city.rank)}
                </span>
              </div>
              <div
                style={{
                  background: "#e5e7eb",
                  height: 24,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(city.population / maxPop) * 100}%`,
                    height: "100%",
                    background: "#3b82f6",
                    transition: "width 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 6,
                  }}
                >
                  {city.population > 0 && (
                    <span style={{ fontSize: 10, color: "white", fontWeight: 600 }}>
                      {city.population > maxPop * 0.15
                        ? city.population.toLocaleString()
                        : ""}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 11, marginTop: 2, opacity: 0.6 }}>
                {city.population.toLocaleString()} ({totalPop > 0 ? ((city.population / totalPop) * 100).toFixed(1) : "0.0"}%)
              </div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            marginTop: 8,
            padding: 12,
            background: "#f3f4f6",
            borderRadius: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>Total Population</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              {totalPop.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>Average</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              {avgPop.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>Largest City</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              {metrics[0]?.name}
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #d1d5db" }}>
                <th style={{ padding: "8px 4px", textAlign: "left", fontWeight: 600 }}>
                  City
                </th>
                <th style={{ padding: "8px 4px", textAlign: "right", fontWeight: 600 }}>
                  Population
                </th>
                <th style={{ padding: "8px 4px", textAlign: "center", fontWeight: 600 }}>
                  Rank
                </th>
                <th style={{ padding: "8px 4px", textAlign: "right", fontWeight: 600 }}>
                  % of Total
                </th>
                <th style={{ padding: "8px 4px", textAlign: "center", fontWeight: 600 }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((city, idx) => (
                <tr
                  key={city.name}
                  style={{
                    borderBottom: "1px solid #e5e7eb",
                    background: idx % 2 === 0 ? "#fafafa" : "transparent",
                  }}
                >
                  <td style={{ padding: "8px 4px", fontWeight: 500 }}>
                    {city.name}
                  </td>
                  <td style={{ padding: "8px 4px", textAlign: "right", fontFamily: "monospace" }}>
                    {city.population.toLocaleString()}
                  </td>
                  <td style={{ padding: "8px 4px", textAlign: "center" }}>
                    {getRankEmoji(city.rank)}
                  </td>
                  <td style={{ padding: "8px 4px", textAlign: "right" }}>
                    {totalPop > 0 ? ((city.population / totalPop) * 100).toFixed(1) : "0.0"}%
                  </td>
                  <td style={{ padding: "8px 4px", textAlign: "center" }}>
                    <button
                      onClick={() => onRemoveCity(city.name)}
                      style={{
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
