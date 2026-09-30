import { renderToStaticMarkup } from "react-dom/server";
import { Timeline, type TimelineEntry } from "../../apps/web/components/timeline/timeline";

export function render(locale: "en" | "tr", count: number) {
  // Synthetic test data only; never imported into a production page or content loader.
  const entries: TimelineEntry[] = Array.from({ length: count }, (_, i) => ({
    id: `fixture-${i}`,
    date: `2022-${String(Math.floor(i / 28) + 1).padStart(2, "0")}-${String(i % 28 + 1).padStart(2, "0")}`,
    title: locale === "tr" ? `Örnek dönüm noktası ${i}` : `Example milestone ${i}`,
    kind: "milestone",
    body: <p>{locale === "tr" ? "Bu, uzun Türkçe metnin dar ekranlarda okunabildiğini denetleyen örnek bir açıklamadır." : "An example caption to verify readable wrapping at narrow widths."}</p>,
    ...(i % 2 === 0 ? { link: `#record-${i}` } : {}),
  }));
  return renderToStaticMarkup(
    <main>
      <h1>{locale === "tr" ? "Zaman çizelgesi testi" : "Timeline test"}</h1>
      <a href="#after" id="before">{locale === "tr" ? "Bölümü atla" : "Skip section"}</a>
      <Timeline id="history" locale={locale} entries={entries}
        viewMoreHref={locale === "tr" ? "/tr/zaman-cizelgesi" : "/en/timeline"} />
      <a id="after" href="#before">{locale === "tr" ? "Bölüm sonu" : "After section"}</a>
    </main>,
  );
}
