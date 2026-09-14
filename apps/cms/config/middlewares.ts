import type { Core } from '@strapi/strapi';

/**
 * `strapi::security` sets a Content-Security-Policy that only permits same-origin images
 * and media. Uploads live on Cloudflare R2 (`media.<DOMAIN>` / the R2 endpoint), so the
 * admin Media Library needs those hosts allowed for `img-src` and `media-src` or every
 * thumbnail 404s. Hosts come from the environment; nothing is hard-coded.
 */
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => {
  const mediaHosts = [env('R2_PUBLIC_URL'), env('R2_ENDPOINT')]
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value as string).host;
      } catch {
        return undefined;
      }
    })
    .filter(Boolean) as string[];

  return [
    'strapi::logger',
    'strapi::errors',
    {
      name: 'strapi::security',
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            'connect-src': ["'self'", 'https:'],
            'img-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io', ...mediaHosts],
            'media-src': ["'self'", 'data:', 'blob:', ...mediaHosts],
            upgradeInsecureRequests: null,
          },
        },
      },
    },
    'strapi::cors',
    'strapi::poweredBy',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ];
};

export default config;
