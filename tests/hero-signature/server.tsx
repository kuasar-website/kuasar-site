import { renderToString } from 'react-dom/server';
import { Fixture } from './fixture';
export const render = (locale: 'en' | 'tr') => renderToString(<Fixture locale={locale} />);
