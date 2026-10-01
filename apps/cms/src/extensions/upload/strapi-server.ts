import { createRequire } from 'node:module';

import { withDisplayDimensions, type GetDimensions, type SharpFactory } from './exif-dimensions';

/**
 * Record the DISPLAYED width and height of EXIF-rotated photos.
 *
 * A phone photo is usually stored as landscape pixels plus an EXIF "rotate 90°" tag.
 * Strapi's `image-manipulation.getDimensions` reads the stored pixels, so it records such a
 * photo with width and height swapped. Browsers and Cloudflare's edge both apply the EXIF
 * rotation when displaying, so the site would reserve a landscape box for a portrait
 * photo, and the page shifts when the photo loads (CLS).
 *
 * The fix is to swap the recorded dimensions for EXIF orientations 5–8 (the four 90°
 * variants). Nothing is re-encoded; the original reaches R2 byte-for-byte. Why this rather
 * than Strapi's auto-orientation: see `src/index.ts` (`UPLOAD_SETTINGS`) and
 * openspec media-pipeline design.md decision 7.
 *
 * RE-CHECK ON EVERY STRAPI UPGRADE. This wraps a Strapi internal: the upload plugin's
 * `image-manipulation` service and its `getDimensions(file)` function. Two things can go
 * wrong after an upgrade (see docs/ops/cms-runbook.md, "Upgrading Strapi"):
 *   - the service or function is renamed or removed → this throws at startup, naming this
 *     file, rather than silently recording swapped dimensions again;
 *   - Strapi starts returning displayed dimensions itself → this swap would rotate them
 *     back. `exif-dimensions.test.ts` asserts Strapi still returns stored dimensions, so
 *     Tier A (`npm run test:media`) fails if that happens. Remove this extension then.
 *
 * `sharp` is loaded from `@strapi/upload`'s own dependency tree, so this is the exact
 * instance Strapi uses and no new dependency is added to apps/cms.
 */

type UploadPlugin = {
  services: Record<string, unknown>;
};

type ImageManipulationService = {
  getDimensions: GetDimensions;
  [key: string]: unknown;
};

const sharp = createRequire(require.resolve('@strapi/upload/package.json'))('sharp') as SharpFactory;

export default (plugin: UploadPlugin): UploadPlugin => {
  const service = plugin.services['image-manipulation'] as ImageManipulationService | undefined;

  if (!service || typeof service.getDimensions !== 'function') {
    throw new Error(
      'apps/cms/src/extensions/upload/strapi-server.ts: the upload plugin no longer exposes ' +
        "service 'image-manipulation' with getDimensions(file). A Strapi upgrade changed it. " +
        'Re-check how Strapi records image dimensions before removing this guard — without it, ' +
        'EXIF-rotated photos are stored with width and height swapped and cause layout shift ' +
        '(openspec media-pipeline design.md decision 7).'
    );
  }

  plugin.services['image-manipulation'] = {
    ...service,
    getDimensions: withDisplayDimensions(service.getDimensions, sharp),
  };

  return plugin;
};
