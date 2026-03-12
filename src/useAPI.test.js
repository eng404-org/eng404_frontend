import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { useApi } from "./useAPI";

function UseApiHarness({ path = "/api/test" }) {
  const { request, loading, error } = useApi();
  const [result, setResult] = React.useState("");

  async function handleRequest() {
    try {
      const data = await request(path);
      setResult(typeof data === "string" ? data : JSON.stringify(data));
    } catch {
      setResult("request failed");
    }
  }

  return (
    <div>
      <button type="button" onClick={handleRequest}>
        Send request
      </button>
      <div data-testid="loading">{loading ? "loading" : "idle"}</div>
      <div data-testid="error">{error || ""}</div>
      <div data-testid="result">{result}</div>
    </div>
  );
}

describe("useApi", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test("returns parsed JSON and clears loading after a successful request", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ status: "ok", count: 3 }),
    });

    render(<UseApiHarness path="/hello" />);
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));

    expect(screen.getByTestId("loading")).toHaveTextContent("loading");

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("idle");
    });

    expect(fetch).toHaveBeenCalledWith("/hello");
    expect(screen.getByTestId("result")).toHaveTextContent('{"status":"ok","count":3}');
    expect(screen.getByTestId("error")).toBeEmptyDOMElement();
  });

  test("returns plain text when the response body is not JSON", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "plain text response",
    });

    render(<UseApiHarness path="/plain-text" />);
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));

    await waitFor(() => {
      expect(screen.getByTestId("result")).toHaveTextContent("plain text response");
    });

    expect(screen.getByTestId("error")).toBeEmptyDOMElement();
  });

  test("stores the formatted error message when the response is not ok", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: async () => JSON.stringify({ detail: "backend offline" }),
    });

    render(<UseApiHarness path="/broken" />);
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));

    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent(
        '503 Service Unavailable: {"detail":"backend offline"}'
      );
    });

    expect(screen.getByTestId("result")).toHaveTextContent("request failed");
    expect(screen.getByTestId("loading")).toHaveTextContent("idle");
  });
});
