import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CityComparison from "./CityComparison";

describe("CityComparison Component", () => {
  const mockOnRemoveCity = jest.fn();

  const mockCities = [
    { name: "New York", state_code: "NY", population: 8336817 },
    { name: "Los Angeles", state_code: "CA", population: 3979576 },
    { name: "Chicago", state_code: "IL", population: 2693976 },
  ];

  beforeEach(() => {
    mockOnRemoveCity.mockClear();
  });

  test("renders null when cities array is empty", () => {
    const { container } = render(
      <CityComparison cities={[]} onRemoveCity={mockOnRemoveCity} />
    );
    expect(container.firstChild).toBeNull();
  });

  test("renders comparison card with title", () => {
    render(<CityComparison cities={mockCities} onRemoveCity={mockOnRemoveCity} />);
    expect(screen.getByText("City Comparison")).toBeInTheDocument();
  });

  test("displays selected cities count", () => {
    render(<CityComparison cities={mockCities} onRemoveCity={mockOnRemoveCity} />);
    expect(screen.queryByText(/3.*selected/)).toBeInTheDocument();
  });

  test("renders all city names in comparison", () => {
    render(<CityComparison cities={mockCities} onRemoveCity={mockOnRemoveCity} />);
    expect(screen.getAllByText("New York").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Los Angeles").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chicago").length).toBeGreaterThan(0);
  });

  test("displays population numbers formatted with commas", () => {
    render(<CityComparison cities={mockCities} onRemoveCity={mockOnRemoveCity} />);
    expect(screen.queryAllByText(/8,336,817/).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/3,979,576/).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/2,693,976/).length).toBeGreaterThan(0);
  });

  test("shows ranking medals for top 3 cities", () => {
    render(<CityComparison cities={mockCities} onRemoveCity={mockOnRemoveCity} />);
    const medalElements = screen.getAllByText(/🥇|🥈|🥉/);
    expect(medalElements.length).toBeGreaterThan(0);
  });

  test("calculates and displays total population", () => {
    render(<CityComparison cities={mockCities} onRemoveCity={mockOnRemoveCity} />);
    expect(screen.getByText("Total Population")).toBeInTheDocument();
    expect(screen.getByText("15,010,369")).toBeInTheDocument();
  });

  test("calculates and displays average population", () => {
    render(<CityComparison cities={mockCities} onRemoveCity={mockOnRemoveCity} />);
    expect(screen.getByText("Average")).toBeInTheDocument();
    expect(screen.getByText("5,003,456")).toBeInTheDocument();
  });

  test("identifies and displays largest city", () => {
    render(<CityComparison cities={mockCities} onRemoveCity={mockOnRemoveCity} />);
    expect(screen.getByText("Largest City")).toBeInTheDocument();
    expect(screen.getAllByText("New York").length).toBeGreaterThan(0);
  });

  test("calculates percentage of total population for each city", () => {
    render(<CityComparison cities={mockCities} onRemoveCity={mockOnRemoveCity} />);
    const percentages = screen.getAllByText(/55\.[0-9]%|26\.[0-9]%|1[7-9]\.[0-9]%/);
    expect(percentages.length).toBeGreaterThan(0);
  });

  test("renders remove button for each city", () => {
    render(<CityComparison cities={mockCities} onRemoveCity={mockOnRemoveCity} />);
    const removeButtons = screen.getAllByText("Remove");
    expect(removeButtons).toHaveLength(3);
  });

  test("calls onRemoveCity when remove button is clicked", () => {
    render(<CityComparison cities={mockCities} onRemoveCity={mockOnRemoveCity} />);
    const removeButtons = screen.getAllByText("Remove");
    fireEvent.click(removeButtons[0]);
    expect(mockOnRemoveCity).toHaveBeenCalledWith("New York");
  });

  test("ranks cities correctly by population", () => {
    render(<CityComparison cities={mockCities} onRemoveCity={mockOnRemoveCity} />);
    const table = screen.getByRole("table");
    const rows = table.querySelectorAll("tbody tr");

    expect(rows.length).toBe(3);
    expect(rows[0]).toHaveTextContent("New York");
    expect(rows[1]).toHaveTextContent("Los Angeles");
    expect(rows[2]).toHaveTextContent("Chicago");
  });

  test("handles single city comparison", () => {
    const singleCity = [{ name: "Boston", state_code: "MA", population: 692600 }];
    render(
      <CityComparison cities={singleCity} onRemoveCity={mockOnRemoveCity} />
    );
    expect(screen.getByText("1 city selected")).toBeInTheDocument();
    expect(screen.getAllByText("Boston").length).toBeGreaterThan(0);
  });

  test("handles cities without population data", () => {
    const citiesWithoutPop = [
      { name: "Test City", state_code: "TX", population: 0 },
    ];
    render(
      <CityComparison
        cities={citiesWithoutPop}
        onRemoveCity={mockOnRemoveCity}
      />
    );
    expect(screen.getAllByText("Test City").length).toBeGreaterThan(0);
    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });

  test("displays state code in parentheses", () => {
    render(<CityComparison cities={mockCities} onRemoveCity={mockOnRemoveCity} />);
    expect(screen.queryAllByText(/(NY|CA|IL)/).length).toBeGreaterThanOrEqual(3);
  });

  test("renders comparison section heading", () => {
    render(<CityComparison cities={mockCities} onRemoveCity={mockOnRemoveCity} />);
    expect(screen.getByText("Population Comparison")).toBeInTheDocument();
  });
});
