// Build-time only: renders one public page to HTML so search engines and AI
// crawlers that do not run JavaScript still get the full text.
// Used by scripts/prerender.mjs; never shipped to the browser.
import { renderToString } from "react-dom/server";
import App from "./App";

export function render(path: string) {
  return renderToString(<App ssrPath={path} helmetContext={{}} />);
}
