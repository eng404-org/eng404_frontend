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
      if (url.includes("/hello")) {
        return Promise.resolve({
          ok: true,
          text: async () => JSON.stringify({ message: "hello ok" }),
        });
      }

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

  test("renders main page content", async () => {
    render(<App />);

    expect(screen.getByText("API observability at a glance")).toBeInTheDocument();
    expect(screen.getByText("ENG404 Frontend Demo")).toBeInTheDocument();
    expect(screen.getByTestId("geo-map")).toBeInTheDocument();
    expect(screen.getByTestId("hello-health-card")).toBeInTheDocument();

    await screen.findByText("New York");
  });

  test("loads default cities on mount and displays them", async () => {
    render(<App />);

    expect(await screen.findByText("New York")).toBeInTheDocument();
    expect(await screen.findByText("Albany")).toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalledWith("http://localhost:8000/hello");
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/cities?state_code=NY&limit=10"
    );
  });

  test("loads states when refresh button is clicked", async () => {
    render(<App />);

    await screen.findByText("New York");

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText(/Records available:/i)).toBeInTheDocument();
      expect(screen.getByText(/"NY": "New York"/i)).toBeInTheDocument();
      expect(screen.getByText(/"CA": "California"/i)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith("http://localhost:8000/state/read");
  });

  test("clear button resets city filters to defaults", async () => {
    render(<App />);

    await screen.findByText("New York");

    const stateInput = screen.getByDisplayValue("NY");
    const limitInput = screen.getByDisplayValue("10");
    const searchInput = screen.getByPlaceholderText("e.g. York");
    const sortSelect = screen.getByDisplayValue("A → Z");

    fireEvent.change(stateInput, { target: { value: "CA" } });
    fireEvent.change(limitInput, { target: { value: "5" } });
    fireEvent.change(searchInput, { target: { value: "San" } });
    fireEvent.change(sortSelect, { target: { value: "desc" } });

    expect(screen.getByDisplayValue("CA")).toBeInTheDocument();
    expect(screen.getByDisplayValue("5")).toBeInTheDocument();
    expect(screen.getByDisplayValue("San")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Z → A")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear/i }));

    expect(screen.getByDisplayValue("NY")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. York")).toHaveValue("");
    expect(screen.getByDisplayValue("A → Z")).toBeInTheDocument();
  });
});