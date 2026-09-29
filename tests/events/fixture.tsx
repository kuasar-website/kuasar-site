import { renderToStaticMarkup } from "react-dom/server";
import { EventsShowcase, type StellarTalkView, type NebulaNightView } from "../../apps/web/components/events/events-showcase";

// Synthetic content is restricted to tests. Production records come from Strapi.
const pixel = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"%3E%3Crect width="640" height="400" fill="%23212940"/%3E%3Ccircle cx="320" cy="200" r="80" fill="%23827aaa"/%3E%3C/svg%3E';
export function entries(locale: "en" | "tr", talks = 1, nights = 1, minimal = false) {
  return {
    talks: Array.from({ length: talks }, (_, i): StellarTalkView => ({
      id: `talk-${i}`, eventNumber: i + 1, speakerName: "Çağrı Öztürk",
      title: locale === "tr" ? `Uzaya açılan yollar ${i + 1}` : `Paths into space ${i + 1}`,
      ...(!minimal && {
        date: '2025-01-15', insight: locale === "tr" ? 'Gökyüzüne birlikte bakıyoruz.' : 'We look to the sky together.',
        speakerPortrait: <img src={pixel} width={640} height={400} loading="lazy" alt="Çağrı Öztürk" />,
        watchUrl: '/destination?watch', readUrl: '/destination?read',
      }),
    })),
    nights: Array.from({ length: nights }, (_, i): NebulaNightView => ({
      id: `night-${i}`, title: locale === "tr" ? `Yıldızların altında ${i + 1}` : `Under the stars ${i + 1}`,
      photos: [{ id: 'photo-1', element: <img src={pixel} width={640} height={400} loading="lazy" alt={locale === "tr" ? 'Birlikte film izleyen öğrenciler' : 'Students watching a film together'} /> }],
      ...(!minimal && { date: '2025-02-15', filmTitle: 'Interstellar', description: locale === "tr" ? 'Film gösteriminin ardından sohbet.' : 'A conversation after the screening.' }),
    })),
  };
}
export function render(locale: "en" | "tr", talks = 1, nights = 1, minimal = false) {
  return renderToStaticMarkup(<main><h1>{locale === "tr" ? 'Etkinlikler' : 'Events'}</h1><EventsShowcase locale={locale} {...entries(locale, talks, nights, minimal)} /></main>);
}
export function renderProps(props: Parameters<typeof EventsShowcase>[0]) {
  return renderToStaticMarkup(<EventsShowcase {...props} />);
}
