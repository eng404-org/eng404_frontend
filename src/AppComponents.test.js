import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Card component from App.js
function Card({ title, subtitle, meta, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          {subtitle && <p className="card-eyebrow">{subtitle}</p>}
          <h2 className="card-title">{title}</h2>
        </div>
        {meta && <span className="card-meta">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

// JsonBox component from App.js
function JsonBox({ value }) {
  return (
    <pre className="json">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

describe('Card Component', () => {
  test('renders card with title', () => {
    render(<Card title="Test Card" />);
    expect(screen.getByText('Test Card')).toBeInTheDocument();
  });

  test('renders card title as h2', () => {
    const { container } = render(<Card title="Test Card" />);
    const heading = container.querySelector('.card-title');
    expect(heading.tagName).toBe('H2');
  });

  test('renders subtitle when provided', () => {
    render(<Card title="Test Card" subtitle="Test Subtitle" />);
    const subtitle = screen.getByText('Test Subtitle');
    expect(subtitle).toHaveClass('card-eyebrow');
  });

  test('renders meta information when provided', () => {
    render(<Card title="Test Card" meta="Important" />);
    const meta = screen.getByText('Important');
    expect(meta).toHaveClass('card-meta');
  });

  test('renders children content', () => {
    render(
      <Card title="Test Card">
        <p>Child content</p>
      </Card>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  test('does not render subtitle when not provided', () => {
    const { container } = render(<Card title="Test Card" />);
    const subtitle = container.querySelector('.card-eyebrow');
    expect(subtitle).not.toBeInTheDocument();
  });

  test('does not render meta when not provided', () => {
    const { container } = render(<Card title="Test Card" />);
    const meta = container.querySelector('.card-meta');
    expect(meta).not.toBeInTheDocument();
  });

  test('has card-header structure', () => {
    const { container } = render(<Card title="Test Card" />);
    const header = container.querySelector('.card-header');
    expect(header).toBeInTheDocument();
  });

  test('renders multiple children', () => {
    render(
      <Card title="Test Card">
        <p>Child 1</p>
        <p>Child 2</p>
        <p>Child 3</p>
      </Card>
    );
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
    expect(screen.getByText('Child 3')).toBeInTheDocument();
  });
});

describe('JsonBox Component', () => {
  test('renders JSON stringified content', () => {
    const testData = { message: 'Hello', status: 'ok' };
    render(<JsonBox value={testData} />);
    const json = screen.getByText(/Hello/);
    expect(json).toBeInTheDocument();
  });

  test('renders pre element with json class', () => {
    const { container } = render(<JsonBox value={{ test: true }} />);
    const preElement = container.querySelector('pre.json');
    expect(preElement).toBeInTheDocument();
  });

  test('formats JSON with indentation', () => {
    const testData = { name: 'John', age: 30 };
    const { container } = render(<JsonBox value={testData} />);
    const preElement = container.querySelector('pre');
    expect(preElement.textContent).toContain('  '); // Check for indentation
  });

  test('handles empty objects', () => {
    render(<JsonBox value={{}} />);
    const emptyJson = screen.getByText('{}');
    expect(emptyJson).toBeInTheDocument();
  });

  test('handles arrays', () => {
    const testData = [1, 2, 3];
    render(<JsonBox value={testData} />);
    const json = screen.getByText(/\[\s*1,\s*2,\s*3\s*\]/);
    expect(json).toBeInTheDocument();
  });

  test('handles nested objects', () => {
    const testData = {
      user: { name: 'John', profile: { age: 30 } }
    };
    render(<JsonBox value={testData} />);
    const preElement = screen.getByText(/John/);
    expect(preElement).toBeInTheDocument();
  });

  test('handles null values', () => {
    render(<JsonBox value={null} />);
    const json = screen.getByText('null');
    expect(json).toBeInTheDocument();
  });

  test('handles string values', () => {
    render(<JsonBox value="test string" />);
    expect(screen.getByText(/"test string"/)).toBeInTheDocument();
  });

  test('handles boolean values', () => {
    render(<JsonBox value={true} />);
    expect(screen.getByText('true')).toBeInTheDocument();
  });

  test('handles numeric values', () => {
    render(<JsonBox value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
