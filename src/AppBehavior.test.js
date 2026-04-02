import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
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

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () => JSON.stringify({}),
  });

  localStorage.clear();
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
    expect(fetch).toHaveBeenCalledWith("http://api.example.com/state/options");
    expect(fetch).toHaveBeenCalledWith("http://api.example.com/state/read");
  });

  expect(screen.getByDisplayValue("http://api.example.com")).toBeInTheDocument();
  expect(screen.getByText("Active base: http://api.example.com")).toBeInTheDocument();
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

  expect(screen.getByText("Active base: http://backend.test:9000")).toBeInTheDocument();
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

  await screen.findByText(/Results:/i);
  expect(screen.getByText(/Results:/i)).toHaveTextContent("Results: 12 (showing 10)");

  await userEvent.type(screen.getByPlaceholderText("e.g. York"), "yo");

  await waitFor(() => {
    expect(screen.getByText(/Results:/i)).toHaveTextContent("Results: 2 (showing 2)");
  });

  const cityCard = screen.getByText("3) City Search").closest(".card");
  expect(within(cityCard).getByText("Yonkers")).toBeInTheDocument();
  expect(within(cityCard).getByText("York")).toBeInTheDocument();

  await userEvent.clear(screen.getByPlaceholderText("e.g. York"));
  await userEvent.selectOptions(screen.getByRole("combobox", { name: /city sort/i }), "desc");

  await waitFor(() => {
    expect(screen.getByText(/Results:/i)).toHaveTextContent("Results: 12 (showing 10)");
  });

  const cityItems = within(cityCard).getAllByRole("listitem");
  expect(within(cityItems[0]).getByText("York")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /load more/i }));

  await waitFor(() => {
    expect(screen.getByText(/Results:/i)).toHaveTextContent("Results: 12 (showing 12)");
  });
});