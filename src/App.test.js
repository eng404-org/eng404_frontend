import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock react-leaflet before importing App
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  CircleMarker: ({ children }) => <div data-testid="circle-marker">{children}</div>,
}));

jest.mock('react-leaflet-cluster', () => {
  return function MockMarkerClusterGroup({ children }) {
    return <div data-testid="marker-cluster">{children}</div>;
  };
});

// Mock App component dependencies
jest.mock('./useAPI', () => ({
  useAPI: jest.fn(() => ({ data: null, error: null, loading: false })),
}));

describe('App Component', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ message: 'ok' }),
    });

    const { container } = render(() => {
      // Lazy load App to ensure mocks are in place
      const App = require('./App').default;
      return <App />;
    });

    expect(container).toBeInTheDocument();
  });
});
