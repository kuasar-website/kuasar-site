import { hydrateRoot } from "react-dom/client";
import { Fixture } from "./fixture";
const locale = document.documentElement.lang === "tr" ? "tr" : "en";
const data = JSON.parse(document.getElementById("data")!.textContent!);
hydrateRoot(document.getElementById("root")!, <Fixture locale={locale} data={data} />);
