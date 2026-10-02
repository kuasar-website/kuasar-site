import type { Locale } from "../../lib/i18n/segments";

/**
 * Every fixed Galactic Summit string, verbatim from the "Bilingual interface
 * copy" requirement in openspec/changes/galactic-summit/specs (approved in
 * bilingual review, tasks.md 4.3, 2026-10-01). Brand names stay English in
 * both locales and are rendered with lang="en" by the components. Change
 * wording here only.
 */
export type SummitCopy = {
  brand: string;
  dateLabel: string;
  locationLabel: string;
  noDate: string;
  upcoming: string;
  live: string;
  register: string;
  registerName: (year: number) => string;
  registrationSoon: string;
  partner: string;
  partnerName: string;
  programme: string;
  speakers: string;
  photos: string;
  contact: string;
  archive: string;
  archivePhotos: (year: number) => string;
  empty: string;
};

export const SUMMIT_COPY: Readonly<Record<Locale, SummitCopy>> = {
  en: {
    brand: "Galactic Summit",
    dateLabel: "Date",
    locationLabel: "Location",
    noDate: "Date to be announced",
    upcoming: "Upcoming",
    live: "Live",
    register: "Register",
    registerName: (year) => `Register for Galactic Summit ${year} (opens in a new tab)`,
    registrationSoon: "Registration opens soon",
    partner: "Become a Partner (PDF)",
    partnerName: "Become a Partner: sponsorship file (PDF, opens in a new tab)",
    programme: "Programme",
    speakers: "Speakers",
    photos: "Photos",
    contact: "Contact",
    archive: "Other editions",
    archivePhotos: (year) => `Photos from Galactic Summit ${year}`,
    empty: "Details of the next Galactic Summit will be announced soon.",
  },
  tr: {
    brand: "Galactic Summit",
    dateLabel: "Tarih",
    locationLabel: "Yer",
    noDate: "Tarih yakında açıklanacak",
    upcoming: "Yaklaşan",
    live: "Şimdi",
    register: "Kayıt ol",
    registerName: (year) => `Galactic Summit ${year} için kayıt ol (yeni sekmede açılır)`,
    registrationSoon: "Kayıtlar yakında",
    partner: "İş ortağımız olun (PDF)",
    partnerName: "İş ortağımız olun: sponsorluk dosyası (PDF, yeni sekmede açılır)",
    programme: "Program",
    speakers: "Konuşmacılar",
    photos: "Fotoğraflar",
    contact: "İletişim",
    archive: "Diğer yıllar",
    archivePhotos: (year) => `Galactic Summit ${year} fotoğrafları`,
    empty: "Bir sonraki Galactic Summit'in ayrıntıları yakında duyurulacak.",
  },
};
