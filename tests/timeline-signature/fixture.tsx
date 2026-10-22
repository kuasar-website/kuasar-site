import { useState } from 'react';
import { Timeline } from '../../apps/web/components/timeline/timeline';
import { TimelineSignature } from '../../apps/web/app/[locale]/(timeline)/_signature/launcher';

export function Fixture({ locale, count, home = false }: { locale: 'en' | 'tr'; count: number; home?: boolean }) {
  const [visible, setVisible] = useState(true);
  const timeline = <Timeline id="timeline" locale={locale} entries={Array.from({ length: count }, (_, i) => ({
    id: `fixture-${i}`, date: `2026-01-${String(28 - i % 28).padStart(2, '0')}`, kind: 'milestone',
    title: `${locale === 'tr' ? 'Dönüm noktası' : 'Milestone'} ${i}`,
    body: <p>{locale === 'tr' ? 'Türkçe açıklama: uzaya birlikte bakıyoruz.' : 'A shared view of space.'}</p>,
    link: `#timeline-entry-fixture-${i}`,
  }))} />;
  return <main>
    <button onClick={() => setVisible(value => !value)}>{visible ? 'Unmount timeline' : 'Mount timeline'}</button>
    {visible && (home ? timeline : <TimelineSignature locale={locale}>{timeline}</TimelineSignature>)}
    <a href="#after" id="after">After timeline</a>
  </main>;
}
