import { renderToString } from 'react-dom/server';
import { StrictMode } from 'react';
import { Fixture } from './fixture';
export function render(locale: 'en' | 'tr', count: number, home: boolean) {
  return renderToString(<StrictMode><Fixture locale={locale} count={count} home={home} /></StrictMode>);
}
