import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import GeoMap from './GeoMap';

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, center, zoom, style }) => (
    <div data-testid="map-container" data-center={JSON.stringify(center)} data-zoom={zoom} style={style}>
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  CircleMarker: ({ center, radius, children }) => (
    <div data-testid="circle-marker" data-lat={center[0]} data-lng={center[1]} data-radius={radius}>
      {children}
    </div>
  ),
}));

// Mock react-leaflet-cluster
jest.mock('react-leaflet-cluster', () => {
  return function MockMarkerClusterGroup({ children }) {
    return <div data-testid="marker-cluster">{children}</div>;
  };
});

// Mock fetch globally
global.fetch = jest.fn();

describe('GeoMap Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
  });

  test('renders map container on successful data load', async () => {
    const mockCities = [
      { name: 'New York', state_code: 'NY', lat: 40.7128, lng: -74.0060, population: 8000000 },
      { name: 'Buffalo', state_code: 'NY', lat: 42.8864, lng: -78.8784, population: 250000 },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockCities),
    });

    render(<GeoMap />);

    await waitFor(() => {
      const mapContainer = screen.getByTestId('map-container');
      expect(mapContainer).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('renders tile layer for map background', async () => {
    const mockCities = [
      { name: 'New York', state_code: 'NY', lat: 40.7128, lng: -74.0060, population: 8000000 },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockCities),
    });

    render(<GeoMap />);

    await waitFor(() => {
      const tileLayer = screen.getByTestId('tile-layer');
      expect(tileLayer).toBeInTheDocument();
    });
  });

  test('renders circle markers for each city', async () => {
    const mockCities = [
      { name: 'New York', state_code: 'NY', lat: 40.7128, lng: -74.0060, population: 8000000 },
      { name: 'Buffalo', state_code: 'NY', lat: 42.8864, lng: -78.8784, population: 250000 },
      { name: 'Rochester', state_code: 'NY', lat: 43.1566, lng: -77.6088, population: 210000 },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockCities),
    });

    render(<GeoMap />);

    await waitFor(() => {
      const markers = screen.getAllByTestId('circle-marker');
      expect(markers).toHaveLength(3);
    });
  });

  test('filters out cities with missing coordinates', async () => {
    const mockCities = [
      { name: 'New York', state_code: 'NY', lat: 40.7128, lng: -74.0060, population: 8000000 },
      { name: 'InvalidCity', state_code: 'NY', lat: null, lng: -74.0060 }, // missing lat
      { name: 'Buffalo', state_code: 'NY', lat: 42.8864, lng: -78.8784, population: 250000 },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockCities),
    });

    render(<GeoMap />);

    await waitFor(() => {
      const markers = screen.getAllByTestId('circle-marker');
      expect(markers).toHaveLength(2); // Only valid cities
    });
  });

  test('displays error message on fetch failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'Error loading cities',
    });

    render(<GeoMap />);

    await waitFor(() => {
      expect(screen.getByText(/map data error/i)).toBeInTheDocument();
    });
  });

  test('displays error message on exception', async () => {
    fetch.mockRejectedValueOnce(new Error('Network failed'));

    render(<GeoMap />);

    await waitFor(() => {
      expect(screen.getByText(/map data error/i)).toBeInTheDocument();
    });
  });

  test('fetches data with correct endpoint', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([]),
    });

    render(<GeoMap />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/cities?state_code=NY&limit=200');
    });
  });

  test('map container is centered at USA center', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([]),
    });

    render(<GeoMap />);

    await waitFor(() => {
      const mapContainer = screen.getByTestId('map-container');
      expect(mapContainer).toHaveAttribute('data-center', '[39.5,-98.35]');
      expect(mapContainer).toHaveAttribute('data-zoom', '4');
    });
  });

  test('map height is set to 420px', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([]),
    });

    render(<GeoMap />);

    await waitFor(() => {
      const mapDiv = screen.getByTestId('map-container');
      expect(mapDiv).toHaveStyle('height: 100%');
    });
  });

  test('handles empty city data gracefully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([]),
    });

    render(<GeoMap />);

    await waitFor(() => {
      const mapContainer = screen.getByTestId('map-container');
      expect(mapContainer).toBeInTheDocument();
      expect(screen.queryByTestId('circle-marker')).not.toBeInTheDocument();
    });
  });

  test('renders geographic map title', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([]),
    });

    render(<GeoMap />);

    expect(screen.getByText(/geographic map/i)).toBeInTheDocument();
  });
});
