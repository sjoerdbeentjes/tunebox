import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { connectEngine } from "./engine/connectEngine";
import "./styles.css";

// Wire the audio engine to the JSON store once, before React renders.
connectEngine();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
