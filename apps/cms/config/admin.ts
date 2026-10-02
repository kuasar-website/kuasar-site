import type { Core } from '@strapi/strapi';

import { previewOrigins, previewUrl } from '../src/preview-url';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET')!,
  },
  apiToken: {
    salt: env('API_TOKEN_SALT')!,
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT')!,
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY')!,
  },
  // Editor preview into the frontend's Draft Mode (publish-integration; ADR 0002 decision 8).
  // Enabled only when both CLIENT_URL (the frontend origin) and PREVIEW_SECRET are set.
  preview: {
    enabled: Boolean(env('CLIENT_URL') && env('PREVIEW_SECRET')),
    config: {
      allowedOrigins: previewOrigins(env('CLIENT_URL')),
      async handler(uid: string, { documentId, locale, status }: { documentId: string; locale?: string; status?: string }) {
        return previewUrl({ uid, documentId, locale, status, clientUrl: env('CLIENT_URL'), secret: env('PREVIEW_SECRET') });
      },
    },
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
    docLinks: env.bool('FLAG_DOC_LINKS', true),
  },
});

export default config;
