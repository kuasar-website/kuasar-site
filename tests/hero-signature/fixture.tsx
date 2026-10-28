import { useLayoutEffect, useState } from 'react';
import { Hero } from '../../apps/web/components/hero/hero';
import { HeroSignature } from '../../apps/web/app/[locale]/_hero-signature/launcher';

export function Fixture({ locale }: { locale: 'en' | 'tr' }) {
  const [mounted, setMounted] = useState(true);
  useLayoutEffect(() => {
    const root = document.querySelector('[data-hero-signature]') as any;
    if (root) root.heroTest = (timeline: any) => { (window as any).heroSequence = timeline; };
    return () => { (window as any).heroSequence = null; };
  }, [mounted]);
  return <main>
    <button onClick={() => setMounted(!mounted)}>Toggle fixture</button>
    {mounted && <HeroSignature><Hero locale={locale}
      sponsorAction={<a href="#after">{locale === 'tr' ? 'İletişime geç' : 'Contact us'}</a>}
      joinAction={<a href="#after">{locale === 'tr' ? 'Bize katıl' : 'Join us'}</a>} /></HeroSignature>}
    <div style={{ height: '200vh' }} /><a id="after" href="#">After hero</a>
  </main>;
}
