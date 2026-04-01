import { useState, useEffect } from "react";

/**
 * Custom hook for loading dropdown options from HATEOAS endpoints
 * @param {string} apiBase - The API base URL
 * @param {string} endpoint - The endpoint path (e.g., '/state/options', '/cities/options')
 * @param {Object} queryParams - Optional query parameters to append to the endpoint
 * @returns {Object} Object containing { options, loading, error }
 */
export function useDropdownOptions(apiBase, endpoint, queryParams = {}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!apiBase || !endpoint) return;

    const loadOptions = async () => {
      setLoading(true);
      setError(null);
      try {
        // Build query string if params provided
        const queryString = Object.entries(queryParams)
          .filter(([_, v]) => v !== null && v !== undefined)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join("&");
        
        const url =
          queryString ? `${endpoint}?${queryString}` : endpoint;

        const response = await fetch(
          `${apiBase.replace(/\/+$/, "")}${
            endpoint.startsWith("/") ? "" : "/"
          }${url}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch options: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        // Handle both { options: [...] } and direct array responses
        const optionsList = data.options || data;
        setOptions(Array.isArray(optionsList) ? optionsList : []);
      } catch (err) {
        setError(err.message);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, [apiBase, endpoint, queryParams]);

  return { options, loading, error };
}

/**
 * Transform dropdown options into a format suitable for <select> elements
 * @param {Array} options - Array of option objects
 * @param {string} valueKey - Property to use as option value (default: 'code' or 'id')
 * @param {string} labelKey - Property to use as option label (default: 'name')
 * @returns {Array} Array of { value, label } objects
 */
export function transformSelectOptions(options, valueKey = null, labelKey = "name") {
  if (!Array.isArray(options)) return [];

  return options.map((opt) => {
    // Auto-detect value key if not provided
    const value =
      opt[valueKey] ||
      opt.code ||
      opt.id ||
      opt.value ||
      Object.values(opt)[0];
    
    const label = opt[labelKey] || opt.name || String(value);

    return {
      value,
      label,
    };
  });
}
