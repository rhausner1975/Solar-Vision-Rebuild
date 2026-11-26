import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Pre-rendered pages (scripts/prerender.mjs) carry head tags for crawlers.
// Drop them so the page's own <Helmet> tags are the only ones once React runs.
document.querySelectorAll("[data-prerendered]").forEach((el) => el.remove());

createRoot(document.getElementById("root")!).render(<App />);
