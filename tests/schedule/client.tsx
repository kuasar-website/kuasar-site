import { hydrateRoot } from "react-dom/client";
import { Fixture } from "./fixture";
const locale = document.documentElement.lang === "tr" ? "tr" : "en";
const events = JSON.parse(document.getElementById("events")!.textContent!);
hydrateRoot(document.getElementById("root")!, <Fixture locale={locale} events={events} />);
