import { renderToString } from "react-dom/server";
import { dataset, Fixture } from "./fixture";
export function render(locale: "tr" | "en", set: string) {
  const events = dataset(locale, set);
  // Fail immediately if anything attempts to derive server-relative state.
  const original = Date.now;
  Date.now = () => { throw new Error("Server clock must not be read"); };
  try { return { html: renderToString(<Fixture locale={locale} events={events} />), events }; }
  finally { Date.now = original; }
}
