import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";

jest.mock("./GeoMap", () => {
  return function MockGeoMap(props) {
    return (
      <div data-testid="geo-map">
        Mock GeoMap
        <button onClick={() => props.onStateSelect("CA")}>Select CA</button>
      </div>
    );
  };
});

jest.mock("./HelloHealthCard", () => {
  return function MockHelloHealthCard({ apiBase }) {
    return <div data-testid="hello-health-card">HelloHealthCard: {apiBase}</div>;
  };
});

describe("App Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    global.fetch = jest.fn((url) => {
      if (url.includes("/cities")) {
        return Promise.resolve({
          ok: true,
          text: async () =>
            JSON.stringify([
              { name: "New York", state_code: "NY" },
              { name: "Albany", state_code: "NY" },
            ]),
        });
      }

      if (url.includes("/state/read")) {
        return Promise.resolve({
          ok: true,
          text: async () =>
            JSON.stringify({
              "Number of Records": 2,
              States: {
                NY: "New York",
                CA: "California",
              },
            }),
        });
      }

      return Promise.resolve({
        ok: true,
        text: async () => JSON.stringify({}),
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders dashboard heading', () => {
    render(<App />);
    const heading = screen.getByText(/API observability at a glance/i);
    expect(heading).toBeInTheDocument();
  });

  test("loads default cities on mount and displays them", async () => {
    render(<App />);

    expect(await screen.findByText("New York")).toBeInTheDocument();
    expect(await screen.findByText("Albany")).toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/cities?state_code=NY&limit=10"
    );
  });

  test("loads states when refresh button is clicked", async () => {
    render(<App />);

    await screen.findByText("New York");

    const refreshButton = screen.getByRole("button", { name: /load states/i });
    fireEvent.click(refreshButton);

   await waitFor(() => {
  expect(screen.getByText(/Records available:/i)).toBeInTheDocument();
  expect(screen.getAllByText(/New York/i)[0]).toBeInTheDocument();
  expect(screen.getAllByText(/California/i)[0]).toBeInTheDocument();
});

    expect(global.fetch).toHaveBeenCalledWith("http://localhost:8000/state/read");
  });

  test("clear button resets city filters to defaults", async () => {
  render(<App />);

  await screen.findByText("New York");

  await waitFor(() => {
    expect(screen.getAllByRole("combobox")[0].options.length).toBeGreaterThan(1);
  });

  const stateSelect = screen.getAllByRole("combobox")[0];
  const limitInput = screen.getByDisplayValue("10");
  const searchInput = screen.getByPlaceholderText("e.g. York");
  const sortSelect = screen.getAllByRole("combobox")[1];

  fireEvent.change(stateSelect, { target: { value: "CA" } });
  fireEvent.change(limitInput, { target: { value: "5" } });
  fireEvent.change(searchInput, { target: { value: "San" } });
  fireEvent.change(sortSelect, { target: { value: "desc" } });

  expect(stateSelect).toHaveValue("CA");
  expect(screen.getByDisplayValue("5")).toBeInTheDocument();
  expect(screen.getByDisplayValue("San")).toBeInTheDocument();
  expect(sortSelect).toHaveValue("desc");

  fireEvent.click(screen.getByRole("button", { name: /clear/i }));

  expect(stateSelect).toHaveValue("NY");
  expect(screen.getByDisplayValue("10")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("e.g. York")).toHaveValue("");
  expect(sortSelect).toHaveValue("asc");
  });
});