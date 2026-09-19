import { renderToString } from "react-dom/server";
import { Fixture } from "./fixture";
export function render(locale: "tr" | "en") {
  // Fail immediately if anything attempts to derive server-relative state.
  const original = Date.now;
  Date.now = () => { throw new Error("Server clock must not be read"); };
  try { return renderToString(<Fixture locale={locale} />); }
  finally { Date.now = original; }
}
