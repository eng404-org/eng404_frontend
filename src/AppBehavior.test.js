import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import App from "./App";

jest.mock("./GeoMap", () => {
  return function MockGeoMap({ selectedState, cities, onCitySelect }) {
    return (
      <div data-testid="geo-map">
        GeoMap {selectedState || "none"} {Array.isArray(cities) ? cities.length : 0}
        {Array.isArray(cities) && cities.length > 0 && (
          <button type="button" onClick={() => onCitySelect?.(cities[0])}>
            Select first map city
          </button>
        )}
      </div>
    );
  };
});

jest.mock("./HelloHealthCard", () => {
  return function MockHelloHealthCard({ apiBase }) {
    return <div data-testid="hello-health-card">HelloHealthCard base: {apiBase}</div>;
  };
});

function jsonResponse(data, extra = {}) {
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () => JSON.stringify(data),
    json: async () => data,
    ...extra,
  });
}

async function waitForInitialAppLoads(base = "http://localhost:8000") {
  await waitFor(() => {
    expect(fetch.mock.calls.map((call) => call[0])).toEqual(
      expect.arrayContaining([
        `${base}/cities?state_code=NY&limit=10`,
        `${base}/state/options`,
        `${base}/state/read`,
      ])
    );
  });
}

async function openHealthTab() {
  await userEvent.click(screen.getByRole("button", { name: /^Health$/i }));
  await screen.findByText(/Server health and API base/i);
}

async function openExplorerTab() {
  await userEvent.click(screen.getByRole("button", { name: /^Explorer$/i }));
  await screen.findByText(/State Catalog/i);
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () => JSON.stringify({}),
    json: async () => ({}),
  });

  localStorage.clear();
  window.location.hash = "";
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("loads and normalizes a saved API base from localStorage on mount", async () => {
  localStorage.setItem("eng404_api_base", "api.example.com/");

  fetch.mockImplementation((url) => {
    const href = String(url);

    if (href.includes("/cities")) {
      return jsonResponse([]);
    }

    if (href.includes("/state/read")) {
      return jsonResponse({
        "Number of Records": 2,
        States: [
          { name: "New York", code: "NY" },
          { name: "California", code: "CA" },
        ],
      });
    }

    if (href.includes("/state/options")) {
      return jsonResponse({
        options: [
          { code: "NY", name: "New York" },
          { code: "CA", name: "California" },
        ],
      });
    }

    return jsonResponse({});
  });

  render(<App />);
  await waitForInitialAppLoads("http://api.example.com");

  expect(fetch.mock.calls.map((call) => call[0])).toEqual(
    expect.arrayContaining([
      "http://api.example.com/cities?state_code=NY&limit=10",
      "http://api.example.com/state/options",
      "http://api.example.com/state/read",
    ])
  );

  await openHealthTab();

  expect(screen.getByDisplayValue("http://api.example.com")).toBeInTheDocument();
  expect(screen.getByTestId("hello-health-card")).toHaveTextContent(
    "HelloHealthCard base: http://api.example.com"
  );
});

test("applies a new API base after successful state/options fetch", async () => {
  fetch.mockImplementation((url) => {
    const href = String(url);

    if (href.includes("/hello")) {
      return jsonResponse({ message: "new base hello" });
    }

    if (href.includes("/cities")) {
      return jsonResponse([]);
    }

    if (href.includes("/state/read")) {
      return jsonResponse({
        "Number of Records": 0,
        States: [],
      });
    }

    if (href.includes("/state/options")) {
      return jsonResponse({
        options: [{ code: "NY", name: "New York" }],
      });
    }

    return jsonResponse({});
  });

  render(<App />);
  await waitForInitialAppLoads();
  await openHealthTab();

  const input = screen.getByPlaceholderText("http://localhost:8000");
  await userEvent.clear(input);
  await userEvent.type(input, "backend.test:9000/");
  await userEvent.click(screen.getByRole("button", { name: /apply & ping/i }));

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith("http://backend.test:9000/hello");
  });

  await waitFor(() => {
    expect(screen.getByTestId("hello-health-card")).toHaveTextContent(
      "HelloHealthCard base: http://backend.test:9000"
    );
  });
  await waitForInitialAppLoads("http://backend.test:9000");

});

test("filters, sorts, and expands the city list returned from the cities endpoint", async () => {
  const cities = [
    { name: "Albany", state_code: "NY" },
    { name: "Boston", state_code: "MA" },
    { name: "Chicago", state_code: "IL" },
    { name: "Denver", state_code: "CO" },
    { name: "El Paso", state_code: "TX" },
    { name: "Fresno", state_code: "CA" },
    { name: "Galveston", state_code: "TX" },
    { name: "Houston", state_code: "TX" },
    { name: "Ithaca", state_code: "NY" },
    { name: "Jackson", state_code: "MS" },
    { name: "Yonkers", state_code: "NY" },
    { name: "York", state_code: "PA" },
  ];

  fetch.mockImplementation((url) => {
    const href = String(url);

    if (href.includes("/cities")) {
      return jsonResponse(cities);
    }

    if (href.includes("/state/read")) {
      return jsonResponse({
        "Number of Records": 2,
        States: [
          { name: "New York", code: "NY" },
          { name: "California", code: "CA" },
        ],
      });
    }

    if (href.includes("/state/options")) {
      return jsonResponse({
        options: [
          { code: "NY", name: "New York" },
          { code: "CA", name: "California" },
        ],
      });
    }

    return jsonResponse({});
  });

  render(<App />);
  await waitForInitialAppLoads();
  await openExplorerTab();

  await screen.findByText(/Results:/i);
  expect(screen.getByText(/Results:/i)).toHaveTextContent("Results: 12 (showing 10)");

  await userEvent.type(screen.getByPlaceholderText("e.g. York"), "yo");

  await waitFor(() => {
    expect(screen.getByText(/Results:/i)).toHaveTextContent("Results: 2 (showing 2)");
  });

  expect(screen.getByText("Yonkers")).toBeInTheDocument();
  expect(screen.getByText("York")).toBeInTheDocument();

  await userEvent.clear(screen.getByPlaceholderText("e.g. York"));
  await userEvent.selectOptions(screen.getByRole("combobox", { name: /city sort/i }), "desc");

  await waitFor(() => {
    expect(screen.getByText(/Results:/i)).toHaveTextContent("Results: 12 (showing 10)");
  });

  const cityItems = screen
  .getAllByRole("listitem")
  .filter((item) =>
    within(item).queryByRole("button", { name: /compare/i })
  );

  expect(within(cityItems[0]).getByText("York")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /load more/i }));

  await waitFor(() => {
    expect(screen.getByText(/Results:/i)).toHaveTextContent("Results: 12 (showing 12)");
  });
});

test("clicking a city shows details panel and hides raw JSON for non-admin", async () => {
    const cities = [
    { name: "Albany", state_code: "NY", population: 100000, latitude: 42.6526, longitude: -73.7562, timezone: "EST" },
    { name: "Boston", state_code: "MA", population: 600000 },
  ];

  fetch.mockImplementation((url) => {
    const href = String(url);

    if (href.includes("/cities")) {
      return jsonResponse(cities);
    }

    if (href.includes("/state/read")) {
      return jsonResponse({
        "Number of Records": 2,
        States: [
          { name: "New York", code: "NY" },
          { name: "Massachusetts", code: "MA" },
        ],
      });
    }

    if (href.includes("/state/options")) {
      return jsonResponse({
        options: [
          { code: "NY", name: "New York" },
          { code: "MA", name: "Massachusetts" },
        ],
      });
    }

    return jsonResponse({});
  });

  render(<App />);
  await waitForInitialAppLoads();
  await openExplorerTab();

  const albanyRow = await screen.findByText("Albany");
  await userEvent.click(albanyRow);

  expect(await screen.findByText(/City Details/i)).toBeInTheDocument();
  expect(screen.getByText(/Population/i).closest(".detail-row")).toHaveTextContent("100000");
  // expect(screen.getByText(/Latitude/i).closest(".detail-row")).toHaveTextContent("42.6526");
  expect(screen.getByText(/timezone/i)).toBeInTheDocument();

  expect(screen.getByRole("button", { name: /^Details$/i })).toHaveClass("active");

  expect(screen.queryByRole("button", { name: /show raw json/i })).not.toBeInTheDocument();
  expect(screen.getByText(/Admin login required to view raw JSON/i)).toBeInTheDocument();
});

test("selecting a city from the map opens City Details", async () => {
  const cities = [
    {
      name: "Albany",
      state_code: "NY",
      population: 100000,
      lat: 42.6526,
      lng: -73.7562,
      timezone: "America/New_York",
    },
  ];

  fetch.mockImplementation((url) => {
    const href = String(url);

    if (href.includes("/cities")) {
      return jsonResponse(cities);
    }

    if (href.includes("/state/read")) {
      return jsonResponse({
        "Number of Records": 1,
        States: [{ name: "New York", code: "NY" }],
      });
    }

    if (href.includes("/state/options")) {
      return jsonResponse({
        options: [{ code: "NY", name: "New York" }],
      });
    }

    return jsonResponse({});
  });

  render(<App />);
  await waitForInitialAppLoads();
  await openExplorerTab();

  await userEvent.click(await screen.findByRole("button", { name: /select first map city/i }));

  expect(await screen.findByText("City Details")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Details$/i })).toHaveClass("active");

  const detailsCard = screen.getByText("City Details").closest(".card");
  expect(within(detailsCard).getByText("Name").closest(".detail-row")).toHaveTextContent("Albany");
  expect(within(detailsCard).getByText("State").closest(".detail-row")).toHaveTextContent("NY");
});

test("details panel clears when selected city is filtered out", async () => {
  const cities = [
    { name: "Albany", state_code: "NY", population: 100000 },
    { name: "Boston", state_code: "MA", population: 600000 },
  ];

  fetch.mockImplementation((url) => {
    const href = String(url);

    if (href.includes("/cities")) {
      return jsonResponse(cities);
    }

    if (href.includes("/state/read")) {
      return jsonResponse({
        "Number of Records": 2,
        States: [
          { name: "New York", code: "NY" },
          { name: "Massachusetts", code: "MA" },
        ],
      });
    }

    if (href.includes("/state/options")) {
      return jsonResponse({
        options: [
          { code: "NY", name: "New York" },
          { code: "MA", name: "Massachusetts" },
        ],
      });
    }

    return jsonResponse({});
  });

  render(<App />);
  await waitForInitialAppLoads();
  await openExplorerTab();

  const albanyRow = await screen.findByText("Albany");
  await userEvent.click(albanyRow);

  expect(screen.getByText("City Details")).toBeInTheDocument();

  const detailsCard = screen.getByText("City Details").closest(".card");
  expect(detailsCard).toBeInTheDocument();
  expect(within(detailsCard).getByText("Name").closest(".detail-row")).toHaveTextContent("Albany");
  expect(within(detailsCard).getByText("State").closest(".detail-row")).toHaveTextContent("NY");

  await userEvent.click(screen.getByRole("button", { name: /^Explore$/i }));

  const searchInput = screen.getByPlaceholderText("e.g. York");
  await userEvent.clear(searchInput);
  await userEvent.type(searchInput, "zzz");

  await waitFor(() => {
    expect(screen.getByText(/Results:/i)).toHaveTextContent("Results: 0");
  });

  await userEvent.click(screen.getByRole("button", { name: /^Details$/i }));

  const emptyDetailsCard = screen.getByText("City Details").closest(".card");
  expect(emptyDetailsCard).toBeInTheDocument();
  expect(within(emptyDetailsCard).getByText("Select a city to inspect details.")).toBeInTheDocument();
  expect(within(emptyDetailsCard).queryByText("Albany")).not.toBeInTheDocument();
  expect(within(emptyDetailsCard).queryByText("NY")).not.toBeInTheDocument();
});
