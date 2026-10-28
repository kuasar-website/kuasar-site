import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { Fixture } from './fixture';
hydrateRoot(document.getElementById('root')!, <StrictMode><Fixture locale={location.pathname === '/tr' ? 'tr' : 'en'} /></StrictMode>);
