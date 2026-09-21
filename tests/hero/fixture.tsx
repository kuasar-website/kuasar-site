import { renderToStaticMarkup } from "react-dom/server";
import { Hero } from "../../apps/web/components/hero/hero";

export function render(locale: "en" | "tr") {
  // Fixture-only anchors: real shared action components come from site-shell.
  return renderToStaticMarkup(<main>
    <Hero locale={locale}
      sponsorAction={<a href="#sponsors">{locale === "tr" ? "İletişime geç" : "Contact us"}</a>}
      joinAction={<a href="#members">{locale === "tr" ? "Bize katıl" : "Join us"}</a>} />
    <div id="sponsors">Sponsor destination fixture</div>
    <div id="members">Member destination fixture</div>
  </main>);
}
