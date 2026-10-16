import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";

import App from "./App.jsx";
import { msalConfig } from "./authConfig";

const msalInstance = new PublicClientApplication(msalConfig);
const stylesheet = window.location.pathname === "/register"
  ? import("./registration.css")
  : import("./index.css");

stylesheet.then(() => {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>,
  );
});
