// Initialize theme before render to avoid flash
const storedTheme = localStorage.getItem('theme');
if (!storedTheme || storedTheme === 'dark') {
  document.documentElement.classList.add('dark');
}

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
