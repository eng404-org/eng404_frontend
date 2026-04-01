import React, { useState } from "react";
import { useDropdownOptions, transformSelectOptions } from "./useDropdownOptions";

/**
 * Example form component demonstrating HATEOAS pattern with cascading dropdowns
 * 
 * This component shows how to:
 * 1. Load options from API endpoints dynamically
 * 2. Filter dependent dropdowns based on parent selection
 * 3. Follow REST/HATEOAS principles by letting the API provide available options
 */
export default function HATEOASFormExample({ apiBase = "http://localhost:8000" }) {
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [formData, setFormData] = useState({
    state: "",
    city: "",
    notes: "",
  });

  // Load all states from HATEOAS endpoint
  const { 
    options: stateOptionsRaw, 
    loading: loadingStates, 
    error: statesError 
  } = useDropdownOptions(apiBase, "/state/options");

  // Load cities, filtered by selected state if available
  const { 
    options: cityOptionsRaw, 
    loading: loadingCities, 
    error: citiesError 
  } = useDropdownOptions(
    apiBase, 
    "/cities/options",
    selectedState ? { state_code: selectedState } : {}
  );

  // Transform options for use in select elements
  const stateSelectOptions = transformSelectOptions(stateOptionsRaw, "code", "name");
  const citySelectOptions = transformSelectOptions(cityOptionsRaw, "id", "name");

  const handleStateChange = (e) => {
    const state = e.target.value;
    setSelectedState(state);
    setFormData((prev) => ({ ...prev, state }));
    // Reset city when state changes
    setSelectedCity("");
    setFormData((prev) => ({ ...prev, city: "" }));
  };

  const handleCityChange = (e) => {
    const city = e.target.value;
    setSelectedCity(city);
    setFormData((prev) => ({ ...prev, city }));
  };

  const handleNotesChange = (e) => {
    setFormData((prev) => ({ ...prev, notes: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted with:", formData);
    alert(`Selected State: ${formData.state}, City: ${formData.city}\nNotes: ${formData.notes}`);
  };

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", padding: "20px" }}>
      <h2>City Selection Form (HATEOAS Example)</h2>
      <p style={{ color: "#666", fontSize: "14px" }}>
        This form demonstrates HATEOAS principles by loading dropdown options from API endpoints.
        When you select a state, the cities dropdown is automatically filtered to show only cities
        in that state.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {/* State Dropdown */}
        <div>
          <label htmlFor="state-select" style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            State
          </label>
          <select
            id="state-select"
            value={selectedState}
            onChange={handleStateChange}
            disabled={loadingStates}
            style={{
              width: "100%",
              padding: "8px",
              fontSize: "14px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          >
            <option value="">
              {loadingStates ? "Loading states..." : "Select a state"}
            </option>
            {stateSelectOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {statesError && <p style={{ color: "red", fontSize: "12px", marginTop: "5px" }}>Error: {statesError}</p>}
        </div>

        {/* Cities Dropdown (dependent on state) */}
        <div>
          <label htmlFor="city-select" style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            City
          </label>
          <select
            id="city-select"
            value={selectedCity}
            onChange={handleCityChange}
            disabled={!selectedState || loadingCities}
            style={{
              width: "100%",
              padding: "8px",
              fontSize: "14px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              opacity: !selectedState ? 0.6 : 1,
            }}
          >
            <option value="">
              {!selectedState
                ? "Select a state first"
                : loadingCities
                ? "Loading cities..."
                : "Select a city"}
            </option>
            {citySelectOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {citiesError && <p style={{ color: "red", fontSize: "12px", marginTop: "5px" }}>Error: {citiesError}</p>}
          {selectedState && citySelectOptions.length === 0 && !loadingCities && !citiesError && (
            <p style={{ color: "#999", fontSize: "12px", marginTop: "5px" }}>No cities found for this state</p>
          )}
        </div>

        {/* Notes Field */}
        <div>
          <label htmlFor="notes" style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={handleNotesChange}
            placeholder="Add any notes about this selection..."
            style={{
              width: "100%",
              padding: "8px",
              fontSize: "14px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              minHeight: "100px",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!selectedState || !selectedCity}
          style={{
            padding: "10px",
            fontSize: "14px",
            fontWeight: "bold",
            backgroundColor: selectedState && selectedCity ? "#007bff" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: selectedState && selectedCity ? "pointer" : "not-allowed",
          }}
        >
          Submit Selection
        </button>
      </form>

      {/* Status Information */}
      <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
        <h4>Current Selection:</h4>
        <p>State: <strong>{selectedState || "None"}</strong></p>
        <p>City: <strong>{selectedCity || "None"}</strong></p>
        <p style={{ fontSize: "12px", color: "#666" }}>
          Available cities: {citySelectOptions.length}
        </p>
      </div>
    </div>
  );
}
