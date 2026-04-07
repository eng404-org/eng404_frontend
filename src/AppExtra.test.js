import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";

// mock child components to avoid heavy dependencies
jest.mock("./GeoMap", () => {
  return function MockGeoMap() {
    return <div data-testid="mock-geomap">GeoMap Component</div>;
  };
});

jest.mock("./HelloHealthCard", () => {
  return function MockHelloHealthCard() {
    return <div data-testid="mock-health">HelloHealthCard</div>;
  };
});

function openHealthTab() {
  fireEvent.click(screen.getByRole("button", { name: /^Health$/i }));
}

function openExplorerTab() {
  fireEvent.click(screen.getByRole("button", { name: /^Explorer$/i }));
}

describe("Extra tests for App", () => {

  test("renders API base input field", () => {
    render(<App />);
    openHealthTab();

    const input = screen.getByPlaceholderText("http://localhost:8000");
    expect(input).toBeInTheDocument();
  });

  test("renders Apply & ping button", () => {
    render(<App />);
    openHealthTab();

    const button = screen.getByText(/apply & ping/i);
    expect(button).toBeInTheDocument();
  });

  test("renders Clear button in city controls", () => {
    render(<App />);
    openExplorerTab();

    const clearButton = screen.getByText(/clear/i);
    expect(clearButton).toBeInTheDocument();
  });

});