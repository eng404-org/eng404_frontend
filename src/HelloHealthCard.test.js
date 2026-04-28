import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HelloHealthCard from './HelloHealthCard';

// Mock fetch globally
global.fetch = jest.fn();

describe('HelloHealthCard Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
  });

  test('renders health check button', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ status: 'ok' }),
    });
    render(<HelloHealthCard />);
    const button = screen.getByRole('button', { name: /check backend status/i });
    expect(button).toBeInTheDocument();
  });

  test('displays "Checking..." while loading', async () => {
    fetch.mockImplementation(
      () => new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          text: async () => JSON.stringify({ status: 'ok' }),
        }), 100)
      )
    );
    render(<HelloHealthCard />);
    const button = screen.getByRole('button', { name: /check backend status/i });
    
    fireEvent.click(button);
    expect(screen.getByText(/checking/i)).toBeInTheDocument();
  });

  test('displays online status on successful health check', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ status: 'ok', message: 'Server is healthy' }),
    });
    
    render(<HelloHealthCard />);
    const button = screen.getByRole('button', { name: /check backend status/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/✅ Online/i)).toBeInTheDocument();
    });
  });

  test('displays offline status on failed health check', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Error',
    });
    
    render(<HelloHealthCard />);
    const button = screen.getByRole('button', { name: /check backend status/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/❌ Offline/i)).toBeInTheDocument();
    });
  });

  test('displays latency after health check', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ status: 'ok' }),
    });
    
    render(<HelloHealthCard />);
    const button = screen.getByRole('button', { name: /check backend status/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/latency:/i)).toBeInTheDocument();
    });
  });

  test('displays error message on network failure', async () => {
    const errorMessage = 'Network request failed';
    fetch.mockRejectedValueOnce(new Error(errorMessage));
    
    render(<HelloHealthCard />);
    const button = screen.getByRole('button', { name: /check backend status/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  test('hides raw JSON data for non-admin users', async () => {
    const mockData = { status: 'ok', version: '1.0.0' };
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockData),
    });
  
    render(<HelloHealthCard isAdmin={false} />);
    const button = screen.getByRole('button', { name: /check backend status/i });
    fireEvent.click(button);
  
    await waitFor(() => {
      expect(screen.queryByText(/show raw json/i)).not.toBeInTheDocument();
      expect(screen.getByText(/admin login required to view raw json/i)).toBeInTheDocument();
    });
  });
  
  test('shows raw JSON data for admin users', async () => {
    const mockData = { status: 'ok', version: '1.0.0' };
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockData),
    });
  
    render(<HelloHealthCard isAdmin={true} />);
    const button = screen.getByRole('button', { name: /check backend status/i });
    fireEvent.click(button);
  
    await waitFor(() => {
      expect(screen.getByText(/show raw json/i)).toBeInTheDocument();
    });
  });

  test('button is disabled while loading', async () => {
    fetch.mockImplementation(
      () => new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          text: async () => JSON.stringify({ status: 'ok' }),
        }), 100)
      )
    );
    
    render(<HelloHealthCard />);
    const button = screen.getByRole('button', { name: /check backend status/i });
    
    fireEvent.click(button);
    expect(button).toBeDisabled();
  });
});
