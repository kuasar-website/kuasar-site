import type { Metadata } from "next";

import { sectionAlternates } from "@/lib/i18n/metadata";
import type { Locale, SectionKey } from "@/lib/i18n/segments";

type PageKind = Extract<SectionKey, "about" | "join">;

const METADATA_COPY: Readonly<
  Record<PageKind, Record<Locale, { title: string; description: string }>>
> = {
  about: {
    en: {
      title: "About KUASAR",
      description:
        "Meet KUASAR, Koç University's student rocketry team, and connect with the team.",
    },
    tr: {
      title: "KUASAR Hakkında",
      description:
        "Koç Üniversitesi öğrenci roket takımı KUASAR'ı tanıyın ve ekiple iletişime geçin.",
    },
  },
  join: {
    en: {
      title: "Join KUASAR",
      description:
        "Explore KUASAR's four sub-teams and apply through the club's Join Us form.",
    },
    tr: {
      title: "KUASAR'a Katıl",
      description:
        "KUASAR'ın dört alt takımını tanıyın ve kulübün Bize Katıl formundan başvurun.",
    },
  },
};

export function pageMetadata(kind: PageKind, locale: Locale): Metadata {
  const copy = METADATA_COPY[kind][locale];

  return {
    title: `${copy.title} | KUASAR`,
    description: copy.description,
    alternates: sectionAlternates(kind, locale),
  };
}
