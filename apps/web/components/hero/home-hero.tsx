import { ActionLink } from "../ui/action-link";
import { sectionPath, type Locale } from "../../lib/i18n/segments";
import { Hero } from "./hero";

type HomeHeroProps = {
  locale: Locale;
  /** Approved Connect Us form/PDF supplied by home composition; never a placeholder. */
  sponsorHref: string;
};

/** Ready for home composition once its localized Join pages are published. */
export function HomeHero({ locale, sponsorHref }: HomeHeroProps) {
  if (!sponsorHref.startsWith("https://") && !/^\/(?!\/)/.test(sponsorHref)) {
    throw new Error("HomeHero requires an approved HTTPS or root-relative sponsor destination");
  }
  return <Hero locale={locale}
    sponsorAction={<ActionLink variant="secondary" href={sponsorHref}>
      {locale === "tr" ? "İletişime geç" : "Contact us"}
    </ActionLink>}
    joinAction={<ActionLink variant="primary" href={sectionPath("join", locale)}>
      {locale === "tr" ? "Bize katıl" : "Join us"}
    </ActionLink>} />;
}
