import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { Fixture } from './fixture';
const query = new URL(location.href).searchParams;
hydrateRoot(document.getElementById('root')!, <StrictMode><Fixture locale={location.pathname === '/tr' ? 'tr' : 'en'} count={Number(query.get('count') ?? 5)} home={query.has('home')} /></StrictMode>);
