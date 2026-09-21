import type { Core } from '@strapi/strapi';

const allowedMediaTypes = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'text/plain',
  'text/csv',
];

const deniedTypes = [
  'image/svg+xml',
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

/**
 * Media uploads go to Cloudflare R2 through the S3-compatible provider
 * (docs/adr/0002-cms.md decision 5). Two details that break the usual first attempt:
 *
 *   - `region: 'auto'`
 *   - **ACL is omitted entirely** — R2 does not support it, and almost every S3 example
 *     on the internet sets it.
 *
 * R2 is REQUIRED in production: Render's disk is ephemeral, so a local-disk upload
 * vanishes on the next deploy and takes every photograph with it. That requirement is
 * enforced in `src/index.ts`'s `register()` lifecycle hook, not here — this file is a
 * Strapi config module, and Strapi evaluates config modules while building the admin
 * panel (`strapi build`) as well as while starting the app, so a throw here would abort
 * the CI build too, which never touches the upload provider at all. `register()` runs
 * only when the app actually starts. Local `develop` without R2 credentials falls back
 * to Strapi's local provider — a documented develop-only path, never committed as
 * production config.
 */
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => {
  const r2 = {
    endpoint: env('R2_ENDPOINT'),
    bucket: env('R2_BUCKET'),
    accessKeyId: env('R2_ACCESS_KEY_ID'),
    accessSecret: env('R2_ACCESS_SECRET'),
    publicUrl: env('R2_PUBLIC_URL'),
  };

  const hasR2 = Boolean(r2.endpoint && r2.bucket && r2.accessKeyId && r2.accessSecret);

  const uploadConfig = hasR2
    ? {
        provider: 'aws-s3',
        providerOptions: {
          baseUrl: r2.publicUrl || undefined,
          s3Options: {
            region: 'auto',
            endpoint: r2.endpoint,
            credentials: {
              accessKeyId: r2.accessKeyId,
              secretAccessKey: r2.accessSecret,
            },
            params: {
              Bucket: r2.bucket,
              // ACL intentionally omitted — R2 does not support it.
            },
          },
        },
        actionOptions: {
          upload: {},
          uploadStream: {},
          delete: {},
        },
      }
    : {};

  return {
    'users-permissions': {
      config: {
        jwtManagement: 'refresh',
        sessions: {
          httpOnly: true,
        },
      },
    },
    upload: {
      config: {
        ...uploadConfig,
        security: {
          allowedTypes: allowedMediaTypes,
          deniedTypes,
        },
      },
    },
  };
};

export default config;
