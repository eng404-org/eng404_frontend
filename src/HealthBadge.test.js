import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// HealthBadge component extracted for testing
function HealthBadge({ ok }) {
  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        fontWeight: 600,
        fontSize: 12,
        border: "1px solid rgba(0,0,0,0.08)",
        background: ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
      }}
    >
      {ok ? "✅ Online" : "❌ Offline"}
    </span>
  );
}

describe('HealthBadge Component', () => {
  test('renders "Online" status when ok is true', () => {
    render(<HealthBadge ok={true} />);
    const badge = screen.getByText(/✅ Online/i);
    expect(badge).toBeInTheDocument();
  });

  test('renders "Offline" status when ok is false', () => {
    render(<HealthBadge ok={false} />);
    const badge = screen.getByText(/❌ Offline/i);
    expect(badge).toBeInTheDocument();
  });

  test('applies correct background color for online status', () => {
    const { container } = render(<HealthBadge ok={true} />);
    const badge = container.querySelector('span');
    expect(badge).toHaveStyle({
      background: "rgba(34,197,94,0.12)"
    });
  });

  test('applies correct background color for offline status', () => {
    const { container } = render(<HealthBadge ok={false} />);
    const badge = container.querySelector('span');
    expect(badge).toHaveStyle({
      background: "rgba(239,68,68,0.12)"
    });
  });

  test('has correct styling applied', () => {
    const { container } = render(<HealthBadge ok={true} />);
    const badge = container.querySelector('span');
    const style = badge.getAttribute('style');
    expect(style).toContain('padding: 6px 10px');
    expect(style).toContain('font-weight: 600');
    expect(style).toContain('border: 1px solid rgba(0,0,0,0.08)');
  });
});
