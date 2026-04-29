import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import GeoMap from "./GeoMap";

const mockFlyTo = jest.fn();
const mockSetView = jest.fn();
const mockOn = jest.fn();
const mockOff = jest.fn();
let mockZoom = 7;

jest.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Popup: ({ children }) => <div>{children}</div>,
  Tooltip: ({ children }) => <div>{children}</div>,
  CircleMarker: ({ children, eventHandlers, center }) => (
    <button
      type="button"
      data-testid="circle-marker"
      data-center={JSON.stringify(center)}
      onClick={() => eventHandlers?.click?.()}
      onMouseOver={() => eventHandlers?.mouseover?.({ target: { openTooltip: jest.fn() } })}
      onMouseOut={() => eventHandlers?.mouseout?.({ target: { closeTooltip: jest.fn() } })}
    >
      {children}
    </button>
  ),
  useMap: () => ({
    flyTo: mockFlyTo,
    setView: mockSetView,
    getZoom: () => mockZoom,
    on: mockOn,
    off: mockOff,
  }),
}));

describe("GeoMap Component", () => {
  beforeEach(() => {
    mockFlyTo.mockClear();
    mockSetView.mockClear();
    mockOn.mockClear();
    mockOff.mockClear();
    mockZoom = 7;
  });

  const states = [
    { name: "New York", code: "NY" },
    { name: "California", code: "CA" },
  ];

  test("renders only state markers when no city data is shown", () => {
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

    expect(screen.getAllByText("New York").length).toBeGreaterThan(0);
    expect(screen.getAllByText("California").length).toBeGreaterThan(0);
  });

  test("renders state markers and city markers when selected state exists and zoom is high enough", () => {
    const cities = [
      { name: "Albany", state_code: "NY", lat: 42.6526, lng: -73.7562, population: 100000 },
      { name: "Los Angeles", state_code: "CA", lat: 34.0522, lng: -118.2437, population: 4000000 },
    ];

    mockZoom = 7;

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

    expect(screen.getAllByText("New York").length).toBeGreaterThan(0);
    expect(screen.getAllByText("California").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Albany").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Los Angeles").length).toBeGreaterThan(0);
  });

  test("does not render city markers when zoom is below threshold", () => {
    const cities = [
      { name: "Albany", state_code: "NY", lat: 42.6526, lng: -73.7562, population: 100000 },
    ];

    mockZoom = 4;

    render(
      <GeoMap
        selectedState="NY"
        cities={cities}
        states={states}
        onStateSelect={jest.fn()}
      />
    );

    const markers = screen.getAllByTestId("circle-marker");
    expect(markers).toHaveLength(2);

    expect(screen.queryByText("Albany")).not.toBeInTheDocument();
  });

  test("does not render city markers when no state is selected", () => {
    const cities = [
      { name: "Albany", state_code: "NY", lat: 42.6526, lng: -73.7562, population: 100000 },
    ];

    mockZoom = 7;

    render(
      <GeoMap
        selectedState={null}
        cities={cities}
        states={states}
        onStateSelect={jest.fn()}
      />
    );

    const markers = screen.getAllByTestId("circle-marker");
    expect(markers).toHaveLength(2);

    expect(screen.queryByText("Albany")).not.toBeInTheDocument();
  });

  test("filters out cities with missing coordinates", () => {
    const cities = [
      { name: "Albany", state_code: "NY", lat: 42.6526, lng: -73.7562, population: 100000 },
      { name: "Nowhere", state_code: "NY" },
      { name: "Half City", state_code: "CA", lat: 33.0 },
    ];

    mockZoom = 7;

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

    expect(screen.getAllByText("Albany").length).toBeGreaterThan(0);
    expect(screen.queryByText("Nowhere")).not.toBeInTheDocument();
    expect(screen.queryByText("Half City")).not.toBeInTheDocument();
  });

  test("supports latitude and longitude field names", () => {
    const cities = [
      { name: "Buffalo", state_code: "NY", latitude: 42.8864, longitude: -78.8784, population: 250000 },
    ];

    mockZoom = 7;

    render(
      <GeoMap
        selectedState="NY"
        cities={cities}
        states={states}
        onStateSelect={jest.fn()}
      />
    );

    expect(screen.getAllByText("Buffalo").length).toBeGreaterThan(0);

    const markers = screen.getAllByTestId("circle-marker");
    expect(markers).toHaveLength(3);
  });

  test("calls setView and onStateSelect when a state marker is clicked", () => {
    const onStateSelect = jest.fn();
  
    render(
      <GeoMap
        selectedState="NY"
        cities={[]}
        states={states}
        onStateSelect={onStateSelect}
      />
    );
  
    const markers = screen.getAllByTestId("circle-marker");
    fireEvent.click(markers[1]);
  
    expect(mockSetView).toHaveBeenCalledWith(
      [36.116203, -119.681564],
      7,
      { animate: true }
    );
  
    expect(onStateSelect).toHaveBeenCalledWith("CA");
  });

  test("calls onCitySelect with the city object when a city marker is clicked", () => {
    const onCitySelect = jest.fn();
    const cities = [
      {
        name: "Albany",
        state_code: "NY",
        lat: 42.6526,
        lng: -73.7562,
        population: 100000,
        timezone: "America/New_York",
      },
    ];

    mockZoom = 7;

    render(
      <GeoMap
        selectedState="NY"
        cities={cities}
        states={states}
        onStateSelect={jest.fn()}
        onCitySelect={onCitySelect}
      />
    );

    const markers = screen.getAllByTestId("circle-marker");
    fireEvent.click(markers[2]);

    expect(onCitySelect).toHaveBeenCalledWith(cities[0]);
  });

  test("flies to selected state using configured state zoom", () => {
    const { rerender } = render(
      <GeoMap
        selectedState="NY"
        cities={[]}
        states={states}
        onStateSelect={jest.fn()}
      />
    );

    expect(mockFlyTo).toHaveBeenCalledWith([42.165726, -74.948051], 7, { duration: 1.2 });

    rerender(
      <GeoMap
        selectedState="CA"
        cities={[]}
        states={states}
        onStateSelect={jest.fn()}
      />
    );

    expect(mockFlyTo).toHaveBeenCalledWith([36.116203, -119.681564], 7, { duration: 1.2 });
  });

  test("shows state tooltip content", () => {
    render(
      <GeoMap
        selectedState={null}
        cities={[]}
        states={states}
        onStateSelect={jest.fn()}
      />
    );
  
    const markers = screen.getAllByTestId("circle-marker");
  
    expect(markers[0]).toHaveTextContent("New York");
    expect(markers[0]).toHaveTextContent("State code: NY");
    expect(markers[0]).toHaveTextContent("Click to load cities");
  
    expect(markers[1]).toHaveTextContent("California");
    expect(markers[1]).toHaveTextContent("State code: CA");
    expect(markers[1]).toHaveTextContent("Click to load cities");
  });

  test("shows city tooltip content when city markers are visible", () => {
    const cities = [
      { name: "Albany", state_code: "NY", lat: 42.6526, lng: -73.7562, population: 100000 },
    ];

    mockZoom = 7;

    render(
      <GeoMap
        selectedState="NY"
        cities={cities}
        states={states}
        onStateSelect={jest.fn()}
      />
    );

    expect(screen.getAllByText("Albany").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Population: 100000").length).toBeGreaterThan(0);
  });
});
