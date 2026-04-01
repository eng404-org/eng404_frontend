/**
 * Tests for useDropdownOptions hook and transformSelectOptions utility
 * 
 * To run these tests:
 * npm test -- useDropdownOptions.test.js
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useDropdownOptions, transformSelectOptions } from './useDropdownOptions';

// Mock fetch
global.fetch = jest.fn();

beforeEach(() => {
  fetch.mockClear();
});

describe('transformSelectOptions', () => {
  test('transforms options with standard structure', () => {
    const options = [
      { code: 'NY', name: 'New York' },
      { code: 'CA', name: 'California' },
    ];
    
    const result = transformSelectOptions(options, 'code', 'name');
    
    expect(result).toEqual([
      { value: 'NY', label: 'New York' },
      { value: 'CA', label: 'California' },
    ]);
  });
  
  test('auto-detects value key if not provided', () => {
    const options = [
      { code: 'NY', name: 'New York' },
    ];
    
    const result = transformSelectOptions(options, null, 'name');
    
    expect(result[0].value).toBeDefined();
    expect(result[0].label).toBe('New York');
  });
  
  test('handles options with id field', () => {
    const options = [
      { id: 'NYC001', name: 'New York' },
    ];
    
    const result = transformSelectOptions(options, 'id', 'name');
    
    expect(result[0].value).toBe('NYC001');
    expect(result[0].label).toBe('New York');
  });
  
  test('returns empty array for non-array input', () => {
    const result = transformSelectOptions(null);
    expect(result).toEqual([]);
  });
  
  test('handles missing label gracefully', () => {
    const options = [
      { code: 'NY' },
    ];
    
    const result = transformSelectOptions(options, 'code', 'name');
    
    expect(result[0].value).toBe('NY');
    expect(result[0].label).toBe('NY'); // Falls back to value
  });
});

describe('useDropdownOptions', () => {
  test('fetches options on mount', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        options: [
          { code: 'NY', name: 'New York' },
        ],
      }),
    });
    
    const { result } = renderHook(() =>
      useDropdownOptions('http://localhost:8000', '/state/options')
    );
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.options).toHaveLength(1);
    expect(result.current.options[0].code).toBe('NY');
  });
  
  test('sets loading to true during fetch', () => {
    fetch.mockImplementationOnce(() =>
      new Promise(resolve =>
        setTimeout(
          () => resolve({
            ok: true,
            json: async () => ({ options: [] }),
          }),
          100
        )
      )
    );
    
    const { result } = renderHook(() =>
      useDropdownOptions('http://localhost:8000', '/state/options')
    );
    
    // Loading should be true immediately
    expect(result.current.loading).toBe(true);
  });
  
  test('handles fetch error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));
    
    const { result } = renderHook(() =>
      useDropdownOptions('http://localhost:8000', '/invalid')
    );
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.error).toBeDefined();
    expect(result.current.options).toEqual([]);
  });
  
  test('handles response with direct array', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { code: 'NY', name: 'New York' },
      ],
    });
    
    const { result } = renderHook(() =>
      useDropdownOptions('http://localhost:8000', '/state/options')
    );
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.options).toHaveLength(1);
  });
  
  test('includes query parameters in request', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ options: [] }),
    });
    
    renderHook(() =>
      useDropdownOptions('http://localhost:8000', '/cities/options', {
        state_code: 'NY',
      })
    );
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    
    const callUrl = fetch.mock.calls[0][0];
    expect(callUrl).toContain('state_code=NY');
  });
  
  test('refetches when endpoint changes', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ options: [] }),
    });
    
    const { rerender } = renderHook(
      ({ endpoint }) =>
        useDropdownOptions('http://localhost:8000', endpoint),
      { initialProps: { endpoint: '/state/options' } }
    );
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    
    rerender({ endpoint: '/cities/options' });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
  
  test('refetches when query parameters change', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ options: [] }),
    });
    
    const { rerender } = renderHook(
      ({ queryParams }) =>
        useDropdownOptions('http://localhost:8000', '/cities/options', queryParams),
      { initialProps: { queryParams: {} } }
    );
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    
    rerender({ queryParams: { state_code: 'NY' } });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
  
  test('skips fetch if endpoint is missing', async () => {
    const { result } = renderHook(() =>
      useDropdownOptions('http://localhost:8000', null)
    );
    
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.options).toEqual([]);
  });
  
  test('handles 404 response', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    
    const { result } = renderHook(() =>
      useDropdownOptions('http://localhost:8000', '/invalid')
    );
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.error).toBeDefined();
    expect(result.current.error).toContain('404');
  });
});
