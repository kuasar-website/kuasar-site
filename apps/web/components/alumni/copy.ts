import type { Locale } from "../../lib/i18n/segments";
import type { SubTeam } from "../../lib/cms/alumni";

export type AlumniCopy = {
  readonly heading: string;
  readonly empty: string;
  readonly yearLeft: (year: number) => string;
  readonly yearUnknown: string;
  readonly joined: (year: number) => string;
  readonly linkedin: (name: string) => string;
  readonly subTeams: Readonly<Record<SubTeam, string>>;
};

export const ALUMNI_COPY: Readonly<Record<Locale, AlumniCopy>> = {
  en: {
    heading: "Alumni",
    empty: "No alumni are listed yet.",
    yearLeft: (year) => `Left in ${year}`,
    yearUnknown: "Year not recorded",
    joined: (year) => `Joined ${year}`,
    linkedin: (name) => `${name} on LinkedIn`,
    subTeams: { propulsion: "Propulsion", avionics: "Avionics", structures: "Structures", software: "Software" },
  },
  tr: {
    heading: "Mezunlar",
    empty: "Henüz listelenmiş mezun yok.",
    yearLeft: (year) => `${year} yılında ayrılanlar`,
    yearUnknown: "Yılı kayıtlı değil",
    joined: (year) => `Katılım ${year}`,
    linkedin: (name) => `${name} LinkedIn profili`,
    subTeams: { propulsion: "İtki", avionics: "Aviyonik", structures: "Yapılar", software: "Yazılım" },
  },
};
