import React from "react";
import { render, screen, waitFor, within, fireEvent} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import App from "./App";

jest.mock("./GeoMap", () => {
  return function MockGeoMap({ selectedState, cities }) {
    return (
      <div data-testid="geo-map">
        GeoMap {selectedState || "none"} {Array.isArray(cities) ? cities.length : 0}
      </div>
    );
  };
});

jest.mock("./HelloHealthCard", () => {
  return function MockHelloHealthCard({ apiBase }) {
    return <div data-testid="hello-health-card">HelloHealthCard base: {apiBase}</div>;
  };
});

function openHealthTab() {
  fireEvent.click(screen.getByRole("button", { name: /^Health$/i }));
}

function openExplorerTab() {
  fireEvent.click(screen.getByRole("button", { name: /^Explorer$/i }));
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () => JSON.stringify({}),
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
      return Promise.resolve({
        ok: true,
        text: async () => JSON.stringify([]),
      });
    }

    if (href.includes("/state/read")) {
      return Promise.resolve({
        ok: true,
        text: async () =>
          JSON.stringify({
            "Number of Records": 2,
            States: [
              { name: "New York", code: "NY" },
              { name: "California", code: "CA" },
            ],
          }),
      });
    }

    if (href.includes("/state/options")) {
      return Promise.resolve({
        ok: true,
        text: async () =>
          JSON.stringify({
            options: [
              { code: "NY", name: "New York" },
              { code: "CA", name: "California" },
            ],
          }),
      });
    }

    return Promise.resolve({
      ok: true,
      text: async () => JSON.stringify({}),
    });
  });

  render(<App />);

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith("http://api.example.com/cities?state_code=NY&limit=10");
  });
  
  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith("http://api.example.com/state/options");
  });
  
  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith("http://api.example.com/state/read");
  });

  openHealthTab();

  expect(screen.getByDisplayValue("http://api.example.com")).toBeInTheDocument();
  expect(screen.getByTestId("hello-health-card")).toHaveTextContent(
    "HelloHealthCard base: http://api.example.com"
  );
});

test("applies a new API base after successful state/options fetch", async () => {
  fetch.mockImplementation((url) => {
    const href = String(url);

    if (href.includes("/hello")) {
      return Promise.resolve({
        ok: true,
        text: async () => JSON.stringify({ message: "new base hello" }),
      });
    }

    if (href.includes("/cities")) {
      return Promise.resolve({
        ok: true,
        text: async () => JSON.stringify([]),
      });
    }

    if (href.includes("/state/read")) {
      return Promise.resolve({
        ok: true,
        text: async () =>
          JSON.stringify({
            "Number of Records": 0,
            States: [],
          }),
      });
    }

    if (href.includes("/state/options")) {
      return Promise.resolve({
        ok: true,
        text: async () =>
          JSON.stringify({
            options: [{ code: "NY", name: "New York" }],
          }),
      });
    }

    return Promise.resolve({
      ok: true,
      text: async () => JSON.stringify({}),
    });
  });

  render(<App />);
  openHealthTab();

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
      return Promise.resolve({
        ok: true,
        text: async () => JSON.stringify(cities),
      });
    }

    if (href.includes("/state/read")) {
      return Promise.resolve({
        ok: true,
        text: async () =>
          JSON.stringify({
            "Number of Records": 2,
            States: [
              { name: "New York", code: "NY" },
              { name: "California", code: "CA" },
            ],
          }),
      });
    }

    if (href.includes("/state/options")) {
      return Promise.resolve({
        ok: true,
        text: async () =>
          JSON.stringify({
            options: [
              { code: "NY", name: "New York" },
              { code: "CA", name: "California" },
            ],
          }),
      });
    }

    return Promise.resolve({
      ok: true,
      text: async () => JSON.stringify({}),
    });
  });

  render(<App />);

  openExplorerTab();

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

test("clicking a city shows details panel and raw JSON toggle", async () => {
  const cities = [
    { name: "Albany", state_code: "NY", population: 100000, latitude: 42.6526, longitude: -73.7562, timezone: "EST" },
    { name: "Boston", state_code: "MA", population: 600000 },
  ];

  fetch.mockImplementation((url) => {
    const href = String(url);

    if (href.includes("/cities")) {
      return Promise.resolve({
        ok: true,
        text: async () => JSON.stringify(cities),
      });
    }

    if (href.includes("/state/read")) {
      return Promise.resolve({
        ok: true,
        text: async () =>
          JSON.stringify({
            "Number of Records": 2,
            States: [
              { name: "New York", code: "NY" },
              { name: "Massachusetts", code: "MA" },
            ],
          }),
      });
    }

    if (href.includes("/state/options")) {
      return Promise.resolve({
        ok: true,
        text: async () =>
          JSON.stringify({
            options: [
              { code: "NY", name: "New York" },
              { code: "MA", name: "Massachusetts" },
            ],
          }),
      });
    }

    return Promise.resolve({
      ok: true,
      text: async () => JSON.stringify({}),
    });
  });

  render(<App />);
  openExplorerTab();

  const albanyRow = await screen.findByText("Albany");
  fireEvent.click(albanyRow);

  expect(await screen.findByText(/City Details/i)).toBeInTheDocument();
  expect(screen.getByText(/Population/i).closest(".detail-row")).toHaveTextContent("100000");
  expect(screen.getByText(/Latitude/i).closest(".detail-row")).toHaveTextContent("42.6526");
  expect(screen.getByText(/timezone/i)).toBeInTheDocument();

  const selectedRow = albanyRow.closest("li");
  expect(selectedRow).toHaveClass("active");

  const toggle = screen.getByRole("button", { name: /show raw json/i });
  fireEvent.click(toggle);
  expect(screen.getByText(/\"Albany\"/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /hide raw json/i }));
  expect(screen.queryByText(/\"Albany\"/)).not.toBeInTheDocument();
});

test("details panel clears when selected city is filtered out", async () => {
  const cities = [
    { name: "Albany", state_code: "NY", population: 100000 },
    { name: "Boston", state_code: "MA", population: 600000 },
  ];

  fetch.mockImplementation((url) => {
    const href = String(url);

    if (href.includes("/cities")) {
      return Promise.resolve({
        ok: true,
        text: async () => JSON.stringify(cities),
      });
    }

    if (href.includes("/state/read")) {
      return Promise.resolve({
        ok: true,
        text: async () =>
          JSON.stringify({
            "Number of Records": 2,
            States: [
              { name: "New York", code: "NY" },
              { name: "Massachusetts", code: "MA" },
            ],
          }),
      });
    }

    if (href.includes("/state/options")) {
      return Promise.resolve({
        ok: true,
        text: async () =>
          JSON.stringify({
            options: [
              { code: "NY", name: "New York" },
              { code: "MA", name: "Massachusetts" },
            ],
          }),
      });
    }

    return Promise.resolve({
      ok: true,
      text: async () => JSON.stringify({}),
    });
  });

  render(<App />);
  openExplorerTab();

  const albanyRow = await screen.findByText("Albany");
  fireEvent.click(albanyRow);
  expect(screen.getByText(/City Details/i)).toBeInTheDocument();
  expect(screen.getByText("Albany · NY")).toBeInTheDocument();

  const searchInput = screen.getByLabelText(/search/i);
  await userEvent.clear(searchInput);
  await userEvent.type(searchInput, "zzz");

  await waitFor(() => {
    expect(screen.getByText(/Results:/i)).toHaveTextContent("Results: 0");
  });

  expect(screen.getByText(/Select a city to inspect details/i)).toBeInTheDocument();
  expect(screen.queryByText("Albany · NY")).not.toBeInTheDocument();
});
