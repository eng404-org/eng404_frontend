import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import GeoMap from "./GeoMap";

const mockFlyTo = jest.fn();

jest.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Popup: ({ children }) => <div>{children}</div>,
  CircleMarker: ({ children, eventHandlers, center }) => (
    <button
      type="button"
      data-testid="circle-marker"
      data-center={JSON.stringify(center)}
      onClick={() => eventHandlers?.click?.()}
    >
      {children}
    </button>
  ),
  useMap: () => ({
    flyTo: mockFlyTo,
  }),
}));

jest.mock("react-leaflet-cluster", () => {
  return function MockMarkerClusterGroup({ children }) {
    return <div data-testid="marker-cluster-group">{children}</div>;
  };
});

describe("GeoMap Component", () => {
  beforeEach(() => {
    mockFlyTo.mockClear();
  });

  const states = [
    { name: "New York", code: "NY" },
    { name: "California", code: "CA" },
  ];

  test("renders state markers plus city markers", () => {
    const cities = [
      { name: "Albany", state_code: "NY", lat: 42.6526, lng: -73.7562, population: 100000 },
      { name: "Los Angeles", state_code: "CA", lat: 34.0522, lng: -118.2437, population: 4000000 },
    ];

    render(
      <GeoMap
        selectedState="NY"
        cities={cities}
        states={states}
        onStateSelect={jest.fn()}
      />
    );

    const markers = screen.getAllByTestId("circle-marker");
    expect(markers).toHaveLength(4);

    expect(screen.getByText("New York")).toBeInTheDocument();
    expect(screen.getByText("California")).toBeInTheDocument();
    expect(screen.getByText("Albany")).toBeInTheDocument();
    expect(screen.getByText("Los Angeles")).toBeInTheDocument();
  });

  test("filters out cities with missing coordinates", () => {
    const cities = [
      { name: "Albany", state_code: "NY", lat: 42.6526, lng: -73.7562 },
      { name: "Nowhere", state_code: "NY" },
      { name: "Half City", state_code: "CA", lat: 33.0 },
    ];

    render(
      <GeoMap
        selectedState="NY"
        cities={cities}
        states={states}
        onStateSelect={jest.fn()}
      />
    );

    const markers = screen.getAllByTestId("circle-marker");
    expect(markers).toHaveLength(3);

    expect(screen.getByText("Albany")).toBeInTheDocument();
    expect(screen.queryByText("Nowhere")).not.toBeInTheDocument();
    expect(screen.queryByText("Half City")).not.toBeInTheDocument();
  });

  test("supports latitude and longitude field names", () => {
    const cities = [
      { name: "Buffalo", state_code: "NY", latitude: 42.8864, longitude: -78.8784, population: 250000 },
    ];

    render(
      <GeoMap
        selectedState="NY"
        cities={cities}
        states={states}
        onStateSelect={jest.fn()}
      />
    );

    expect(screen.getByText("Buffalo")).toBeInTheDocument();

    const markers = screen.getAllByTestId("circle-marker");
    expect(markers).toHaveLength(3);
  });

  test("calls onStateSelect when a state marker is clicked", () => {
    const onStateSelect = jest.fn();

    render(
      <GeoMap
        selectedState="NY"
        cities={[]}
        states={states}
        onStateSelect={onStateSelect}
      />
    );

    fireEvent.click(screen.getByText("California"));
    expect(onStateSelect).toHaveBeenCalledWith("CA");
  });

  test("flies to selected state when selectedState changes", () => {
    const { rerender } = render(
      <GeoMap
        selectedState="NY"
        cities={[]}
        states={states}
        onStateSelect={jest.fn()}
      />
    );

    expect(mockFlyTo).toHaveBeenCalledWith([42.165726, -74.948051], 6, { duration: 1.2 });

    rerender(
      <GeoMap
        selectedState="CA"
        cities={[]}
        states={states}
        onStateSelect={jest.fn()}
      />
    );

    expect(mockFlyTo).toHaveBeenCalledWith([36.116203, -119.681564], 6, { duration: 1.2 });
  });

  test("handles empty city data gracefully", () => {
    render(
      <GeoMap
        selectedState={null}
        cities={[]}
        states={states}
        onStateSelect={jest.fn()}
      />
    );

    expect(screen.getByText("City Distribution Map")).toBeInTheDocument();
    expect(screen.getByTestId("map-container")).toBeInTheDocument();

    const markers = screen.getAllByTestId("circle-marker");
    expect(markers).toHaveLength(2);
  });
});