import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

const stylesheet =
  window.location.pathname === "/register"
    ? import("./registration.css")
    : import("./index.css");

stylesheet.then(() => {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});