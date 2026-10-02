import { SummitView, type RenderImage } from "../../apps/web/components/summit/summit-page";
import type { SummitData, SummitEdition } from "../../apps/web/lib/summit/data";

// Synthetic editions exist only in tests. Production editions come from Strapi via lib/summit/data.ts.
type Locale = "en" | "tr";
const pixel = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"%3E%3Crect width="1600" height="900" fill="%23212940"/%3E%3C/svg%3E';
const image = (alt: string) => ({ src: pixel, width: 1600, height: 900, alt, unoptimized: true });
export type Options = { set: string; accent: SummitEdition["accentToken"]; treatment: SummitEdition["heroTreatment"]; pdf: boolean; reg: boolean; date: string | null };

function edition(locale: Locale, year: number, extra: Partial<SummitEdition> = {}): SummitEdition {
  const tr = locale === "tr";
  return {
    id: `s${year}`, year, date: `${year}-11-07T07:00:00.000Z`, location: "SGKM", isCurrent: false,
    purpose: tr ? `Galactic Summit ${year} amacı.` : `Purpose of Galactic Summit ${year}.`,
    programme: [{ time: "10:00", title: tr ? "Açılış" : "Opening", description: null }, { time: "11:00", title: tr ? "Panel" : "Panel", description: tr ? "Roketçilik üzerine." : "On rocketry." }],
    speakers: [{ name: "Çağrı Öztürk", role: "Engineer", portrait: image(tr ? "Çağrı Öztürk portresi" : "Portrait of Çağrı Öztürk") }],
    photos: [{ id: `s${year}-photo-0`, image: image(tr ? "Salondaki katılımcılar" : "Attendees in the hall") }, { id: `s${year}-photo-1`, image: image(tr ? "Sahnedeki konuşmacı" : "Speaker on stage") }],
    contactAddress: "summit@kuasar.org", sponsorshipPdf: null, registrationUrl: null,
    accentToken: "aurora", heroTreatment: "gradient", backgroundImage: null, contentLocale: locale, ...extra,
  };
}

export function dataset(locale: Locale, o: Options): SummitData {
  if (o.set === "zero") return { current: null, others: [] };
  const current = edition(locale, 2026, {
    isCurrent: true, accentToken: o.accent, heroTreatment: o.treatment, date: o.date,
    backgroundImage: o.treatment === "gradient" ? null : image(locale === "tr" ? "Konferans salonu" : "Conference hall"),
    sponsorshipPdf: o.pdf ? "https://media.kuasar.org/sponsorship.pdf" : null,
    registrationUrl: o.reg ? "https://forms.gle/fixture" : null,
    ...(o.set === "sparse" && { programme: [], speakers: [], photos: [], contactAddress: null, purpose: null, location: null }),
  });
  const others = o.set === "many"
    ? [2025, 2024, 2023].map((year) => edition(year === 2024 && locale === "tr" ? "en" : locale, year))
    : [];
  return { current, others };
}

const renderImage: RenderImage = (img, { aspectRatio }) => aspectRatio
  ? <span style={{ display: "block", aspectRatio }}><img src={img.src} alt={img.alt} style={{ inlineSize: "100%", blockSize: "100%", objectFit: "cover" }} /></span>
  : <img src={img.src} alt={img.alt} width={img.width} height={img.height} />;

export function Fixture({ locale, data }: { locale: Locale; data: SummitData }) {
  return <main lang={locale}><SummitView locale={locale} data={data} renderImage={renderImage} /></main>;
}
