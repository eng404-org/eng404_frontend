import React from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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


 afterEach(async () => {
   await act(async () => {
     await Promise.resolve();
     await Promise.resolve();
   });
   jest.restoreAllMocks();
 });

 async function waitForInitialAppLoads(base = "http://localhost:8000") {
   await waitFor(() => {
     expect(global.fetch.mock.calls.map((call) => call[0])).toEqual(
       expect.arrayContaining([
         `${base}/cities?state_code=NY&limit=10`,
         `${base}/state/options`,
         `${base}/state/read`,
       ])
     );
   });

   await act(async () => {
     await Promise.all(
       global.fetch.mock.results
         .map((result) => result.value)
         .filter((value) => value && typeof value.then === "function")
     );
     await Promise.resolve();
     await Promise.resolve();
   });
 }

 async function waitForCitiesFetch(path) {
   await waitFor(() => {
     expect(global.fetch).toHaveBeenCalledWith(`http://localhost:8000${path}`);
   });

   await act(async () => {
     await Promise.resolve();
     await Promise.resolve();
   });
 }

 async function renderApp() {
   let result;
   await act(async () => {
     result = render(<App />);
     await Promise.resolve();
     await Promise.resolve();
   });
   await waitForInitialAppLoads();
   return result;
 }

 async function openExplorerTab() {
   await userEvent.click(screen.getByRole("button", { name: /^Explorer$/i }));
   await screen.findByText(/State Catalog/i);
 }

 async function openHealthTab() {
   await userEvent.click(screen.getByRole("button", { name: /^Health$/i }));
   await screen.findByText(/Server health and API base/i);
 }

 test("renders intro tab by default", async () => {
   await renderApp();
   expect(
     screen.getByText(/Welcome to the ENG404 geography dashboard/i)
   ).toBeInTheDocument();
   expect(window.location.hash).toBe("#intro");
 });


 test("loads health tab when hash is set on first load", async () => {
   window.location.hash = "#health";
   await renderApp();


   expect(await screen.findByText(/Server health and API base/i)).toBeInTheDocument();
   expect(window.location.hash).toBe("#health");
 });


 test("clicking Explorer updates the URL hash", async () => {
   await renderApp();
   await openExplorerTab();


   await waitFor(() => {
     expect(window.location.hash).toBe("#explorer");
   });
 });


 test("restores last tab from localStorage when no hash exists", async () => {
   localStorage.setItem("eng404_active_tab", "explorer");
   await renderApp();


   await waitFor(() => {
     expect(window.location.hash).toBe("#explorer");
   });


   expect(await screen.findByText(/State Catalog/i)).toBeInTheDocument();
 });

 test("loads default cities on mount and displays them", async () => {
   await renderApp();
   await openExplorerTab();


   expect((await screen.findAllByText("New York")).length).toBeGreaterThan(0);
   expect(await screen.findByText("Albany")).toBeInTheDocument();


   expect(global.fetch).toHaveBeenCalledWith(
    "http://localhost:8000/cities?state_code=NY&limit=10"
    );
 });


 test("loads states when refresh button is clicked", async () => {
   await renderApp();
   await openExplorerTab();


   await screen.findAllByText("New York");


   const refreshButton = screen.getByRole("button", { name: /load states/i });
   await userEvent.click(refreshButton);


   expect(await screen.findByText(/Total states:/i)).toBeInTheDocument();
   const stateList = screen.getByRole("list", { name: /state list/i });
   expect(within(stateList).getByText(/New York/i)).toBeInTheDocument();
   expect(within(stateList).getByText(/California/i)).toBeInTheDocument();


   expect(global.fetch).toHaveBeenCalledWith("http://localhost:8000/state/options");
   expect(global.fetch).toHaveBeenCalledWith("http://localhost:8000/state/read");
 });


 
 test("clear button resets city filters to defaults", async () => {
 await renderApp();
 await openExplorerTab();


 await screen.findAllByText("New York");


 await waitFor(() => {
   expect(screen.getByRole("combobox", { name: /state_code/i }).options.length).toBeGreaterThan(1);
 });


 const stateSelect = screen.getByRole("combobox", { name: /state_code/i });
 const searchInput = screen.getByPlaceholderText("e.g. York");
 const sortSelect = screen.getByRole("combobox", { name: /city sort/i });


 await userEvent.selectOptions(stateSelect, "CA");
 await waitForCitiesFetch("/cities?state_code=CA&limit=10");
 await userEvent.clear(searchInput);
 await userEvent.type(searchInput, "San");
 await userEvent.selectOptions(sortSelect, "desc");


 expect(stateSelect).toHaveValue("CA");
 expect(screen.getByDisplayValue("San")).toBeInTheDocument();
 expect(sortSelect).toHaveValue("desc");


 await userEvent.click(screen.getByRole("button", { name: /clear/i }));
 await waitForCitiesFetch("/cities?state_code=NY&limit=10");


 expect(stateSelect).toHaveValue("NY");
 expect(searchInput).toHaveValue("");
 expect(sortSelect).toHaveValue("asc");
 });


test("passes admin status to health card after admin login", async () => {
  await renderApp();

  await userEvent.type(screen.getByPlaceholderText(/Admin/i), "admin@eng404.com");

  await userEvent.type(screen.getByPlaceholderText("••••"), "eng404");

  await userEvent.click(screen.getByRole("button", { name: /^Login$/i }));

  await waitFor(() => {
    expect(screen.getByText(/^Admin$/i)).toBeInTheDocument();
  });

  await openHealthTab();

  await waitFor(() => {
    expect(screen.getByTestId("hello-health-card")).toHaveTextContent("Admin: true");
  });
});
});
