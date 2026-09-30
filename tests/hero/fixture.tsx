import { renderToStaticMarkup } from "react-dom/server";
import { PathnameContext, SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { HomeHero } from "../../apps/web/components/hero/home-hero";
import { SiteShell } from "../../apps/web/components/shell/site-shell";

export function render(locale: "en" | "tr") {
  return renderToStaticMarkup(
    <PathnameContext.Provider value={`/${locale}`}>
      <SearchParamsContext.Provider value={new URLSearchParams()}>
        <SiteShell locale={locale}>
          <HomeHero locale={locale} sponsorHref={`/${locale}/connect-fixture`} />
        </SiteShell>
      </SearchParamsContext.Provider>
    </PathnameContext.Provider>,
  );
}
