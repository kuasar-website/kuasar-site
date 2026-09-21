import { hydrateRoot } from "react-dom/client";
import { Fixture } from "./fixture";
const locale = document.documentElement.lang === "tr" ? "tr" : "en";
hydrateRoot(document.getElementById("root")!, <Fixture locale={locale} />);
