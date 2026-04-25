import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";


jest.mock("./GeoMap", () => {
 return function MockGeoMap(props) {
   return (
     <div data-testid="geo-map">
       Mock GeoMap
       <button onClick={() => props.onStateSelect("CA")}>Select CA</button>
     </div>
   );
 };
});


jest.mock("./HelloHealthCard", () => {
  return function MockHelloHealthCard({ apiBase, isAdmin }) {
    return (
      <div data-testid="hello-health-card">
        HelloHealthCard: {apiBase} Admin: {String(isAdmin)}
      </div>
    );
  };
 });


describe("App Component", () => {
 beforeEach(() => {
   jest.clearAllMocks();
   localStorage.clear();
   window.location.hash = "";


   global.fetch = jest.fn((url) => {
     if (url.includes("/cities")) {
       return Promise.resolve({
         ok: true,
         text: async () =>
           JSON.stringify([
             { name: "New York", state_code: "NY" },
             { name: "Albany", state_code: "NY" },
           ]),
         json: async () => [
           { name: "New York", state_code: "NY" },
           { name: "Albany", state_code: "NY" },
         ],
       });
     }


     if (url.includes("/state/options")) {
       return Promise.resolve({
         ok: true,
         text: async () =>
           JSON.stringify({
             options: [
               { code: "NY", name: "New York" },
               { code: "CA", name: "California" },
             ],
           }),
         json: async () => ({
           options: [
             { code: "NY", name: "New York" },
             { code: "CA", name: "California" },
           ],
         }),
       });
     }


     if (url.includes("/state/read")) {
       return Promise.resolve({
         ok: true,
         text: async () =>
           JSON.stringify({
             "Number of Records": 2,
             States: [
               { code: "NY", name: "New York" },
               { code: "CA", name: "California" },
             ],
           }),
         json: async () => ({
           "Number of Records": 2,
           States: [
             { code: "NY", name: "New York" },
             { code: "CA", name: "California" },
           ],
         }),
       });
     }

     if (url.includes("/login")) {
      return Promise.resolve({
        ok: true,
        text: async () =>
          JSON.stringify({
            Message: "Login successful",
            email: "admin@eng404.com",
          }),
        json: async () => ({
          Message: "Login successful",
          email: "admin@eng404.com",
        }),
      });
    }

     return Promise.resolve({
       ok: true,
       text: async () => JSON.stringify({}),
       json: async () => ({}),
     });
   });
 });


 afterEach(() => {
   jest.restoreAllMocks();
 });
 test("renders intro tab by default", () => {
   render(<App />);
   expect(
     screen.getByText(/Welcome to the ENG404 geography dashboard/i)
   ).toBeInTheDocument();
   expect(window.location.hash).toBe("#intro");
 });


 test("loads health tab when hash is set on first load", async () => {
   window.location.hash = "#health";
   render(<App />);


   expect(await screen.findByText(/Server health and API base/i)).toBeInTheDocument();
   expect(window.location.hash).toBe("#health");
 });


 test("clicking Explorer updates the URL hash", async () => {
   render(<App />);
   const explorerTab = screen.getByRole("button", { name: /^Explorer$/i });
   fireEvent.click(explorerTab);


   await waitFor(() => {
     expect(window.location.hash).toBe("#explorer");
   });
 });


 test("restores last tab from localStorage when no hash exists", async () => {
   localStorage.setItem("eng404_active_tab", "explorer");
   render(<App />);


   await waitFor(() => {
     expect(window.location.hash).toBe("#explorer");
   });


   expect(await screen.findByText(/State Catalog/i)).toBeInTheDocument();
 });


 async function openExplorerTab() {
   const explorerTab = screen.getByRole("button", { name: /^Explorer$/i });
   fireEvent.click(explorerTab);
 }


 test("loads default cities on mount and displays them", async () => {
   render(<App />);
   await openExplorerTab();


   expect((await screen.findAllByText("New York")).length).toBeGreaterThan(0);
   expect(await screen.findByText("Albany")).toBeInTheDocument();


   expect(global.fetch).toHaveBeenCalledWith(
    "http://localhost:8000/cities?state_code=NY&limit=10"
    );
 });


 test("loads states when refresh button is clicked", async () => {
   render(<App />);
   await openExplorerTab();


   await screen.findAllByText("New York");


   const refreshButton = screen.getByRole("button", { name: /load states/i });
   fireEvent.click(refreshButton);


   expect(await screen.findByText(/Total states:/i)).toBeInTheDocument();
   const stateList = screen.getByRole("list", { name: /state list/i });
   expect(within(stateList).getByText(/New York/i)).toBeInTheDocument();
   expect(within(stateList).getByText(/California/i)).toBeInTheDocument();


   expect(global.fetch).toHaveBeenCalledWith("http://localhost:8000/state/options");
   expect(global.fetch).toHaveBeenCalledWith("http://localhost:8000/state/read");
 });


 
 test("clear button resets city filters to defaults", async () => {
 render(<App />);
 await openExplorerTab();


 await screen.findAllByText("New York");


 await waitFor(() => {
   expect(screen.getByRole("combobox", { name: /state_code/i }).options.length).toBeGreaterThan(1);
 });


 const stateSelect = screen.getByRole("combobox", { name: /state_code/i });
 const searchInput = screen.getByPlaceholderText("e.g. York");
 const sortSelect = screen.getByRole("combobox", { name: /city sort/i });


 fireEvent.change(stateSelect, { target: { value: "CA" } });
 fireEvent.change(searchInput, { target: { value: "San" } });
 fireEvent.change(sortSelect, { target: { value: "desc" } });


 expect(stateSelect).toHaveValue("CA");
 expect(screen.getByDisplayValue("San")).toBeInTheDocument();
 expect(sortSelect).toHaveValue("desc");


 fireEvent.click(screen.getByRole("button", { name: /clear/i }));


 expect(stateSelect).toHaveValue("NY");
 expect(searchInput).toHaveValue("");
 expect(sortSelect).toHaveValue("asc");
 });


test("passes admin status to health card after admin login", async () => {
  render(<App />);

  fireEvent.change(screen.getByPlaceholderText(/Admin/i), {
    target: { value: "admin@eng404.com" },
  });

  fireEvent.change(screen.getByPlaceholderText("••••"), {
    target: { value: "eng404" },
  });

  fireEvent.click(screen.getByRole("button", { name: /^Login$/i }));

  fireEvent.click(screen.getByRole("button", { name: /^Health$/i }));

  await waitFor(() => {
    expect(screen.getByTestId("hello-health-card")).toHaveTextContent("Admin: true");
  });
});
});



