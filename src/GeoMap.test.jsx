import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GeoMap from './GeoMap';

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, center, zoom, style }) => (
    <div
      data-testid="map-container"
      data-center={JSON.stringify(center)}
      data-zoom={zoom}
      style={style}
    >
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  CircleMarker: ({ center, radius, children, eventHandlers }) => (
    <div
      data-testid="circle-marker"
      data-lat={center[0]}
      data-lng={center[1]}
      data-radius={radius}
      onClick={() => eventHandlers?.click?.()}
    >
      {children}
    </div>
  ),
  useMap: () => ({
    flyTo: jest.fn(),
  }),
}));

jest.mock('react-leaflet-cluster', () => {
  return function MockMarkerClusterGroup({ children }) {
    return <div data-testid="marker-cluster">{children}</div>;
  };
});

describe('GeoMap Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders map container', () => {
    render(<GeoMap cities={[]} />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  test('renders tile layer for map background', () => {
    render(<GeoMap cities={[]} />);
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
  });

  test('renders geographic map title', () => {
    render(<GeoMap cities={[]} />);
    expect(screen.getByText(/geographic map/i)).toBeInTheDocument();
  });

  test('renders selected state summary text', () => {
    render(<GeoMap selectedState="NY" cities={[]} />);
    expect(screen.getByText(/selected state: ny/i)).toBeInTheDocument();
  });

  test('renders state markers plus city markers', () => {
    const mockCities = [
      { name: 'New York', state_code: 'NY', lat: 40.7128, lng: -74.006, population: 8000000 },
      { name: 'Buffalo', state_code: 'NY', lat: 42.8864, lng: -78.8784, population: 250000 },
    ];

    render(<GeoMap cities={mockCities} />);
    const markers = screen.getAllByTestId('circle-marker');
    expect(markers).toHaveLength(7);
  });

  test('filters out cities with missing coordinates', () => {
    const mockCities = [
      { name: 'New York', state_code: 'NY', lat: 40.7128, lng: -74.006, population: 8000000 },
      { name: 'Invalid City', state_code: 'NY', lat: null, lng: -74.006 },
      { name: 'Buffalo', state_code: 'NY', lat: 42.8864, lng: -78.8784, population: 250000 },
    ];

    render(<GeoMap cities={mockCities} />);
    const markers = screen.getAllByTestId('circle-marker');
    expect(markers).toHaveLength(7);
  });

  test('supports latitude and longitude field names', () => {
    const mockCities = [
      { name: 'Albany', state_code: 'NY', latitude: 42.6526, longitude: -73.7562, population: 100000 },
    ];

    render(<GeoMap cities={mockCities} />);
    const markers = screen.getAllByTestId('circle-marker');
    expect(markers).toHaveLength(6);
  });

  test('calls onStateSelect when a state marker is clicked', () => {
    const onStateSelect = jest.fn();

    render(<GeoMap cities={[]} onStateSelect={onStateSelect} />);
    const markers = screen.getAllByTestId('circle-marker');

    fireEvent.click(markers[0]);
    expect(onStateSelect).toHaveBeenCalled();
  });

  test('map container is centered at USA center', () => {
    render(<GeoMap cities={[]} />);
    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toHaveAttribute('data-center', '[39.5,-98.35]');
    expect(mapContainer).toHaveAttribute('data-zoom', '4');
  });

  test('map height is set to 420px container wrapper via map container height 100%', () => {
    render(<GeoMap cities={[]} />);
    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toHaveStyle('height: 100%');
  });

  test('handles empty city data gracefully', () => {
    render(<GeoMap cities={[]} />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    const markers = screen.getAllByTestId('circle-marker');
    expect(markers).toHaveLength(5);
  });
});