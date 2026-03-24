import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./styles.css";

// Build marker helps rotate hashed bundles when CDN caches stale assets.
(window as Window & { __DISCORDVIP_ADMIN_BUILD__?: string }).__DISCORDVIP_ADMIN_BUILD__ =
  "2026-03-12-1048";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
