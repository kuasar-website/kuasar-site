import { renderToString } from "react-dom/server";
import { dataset, Fixture, type Options } from "./fixture";
export function render(locale: "tr" | "en", options: Options) {
  const data = dataset(locale, options);
  // Fail immediately if anything attempts to derive server-relative state.
  const original = Date.now;
  Date.now = () => { throw new Error("Server clock must not be read"); };
  try { return { html: renderToString(<Fixture locale={locale} data={data} />), data }; }
  finally { Date.now = original; }
}
