import type { Core } from '@strapi/strapi';

const TURKISH_LOCALE = { code: 'tr', name: 'Turkish (tr)' };

const REQUIRED_R2_VARS = ['R2_ENDPOINT', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_ACCESS_SECRET'] as const;

/**
 * R2 is REQUIRED in production: Render's disk is ephemeral, so a local-disk upload
 * vanishes on the next deploy and takes every photograph with it (docs/adr/0002-cms.md
 * decision 5). This must run in `register()`, the earliest application lifecycle hook,
 * rather than in `config/plugins.ts` — Strapi evaluates config modules both when starting
 * the app and when `strapi build` constructs a standalone instance to compile the admin
 * panel, and that build never touches the upload provider. `register()` only runs when
 * the app actually starts, so checking here reproduces "production refuses to start
 * without real R2 config" (docs/ops/cms-runbook.md step 5) without also failing the CI
 * build.
 */
function assertProductionMediaStorage(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const missing = REQUIRED_R2_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      'Media storage is not configured. Set R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID and ' +
        'R2_ACCESS_SECRET (Cloudflare R2). Production must not write uploads to local disk — ' +
        'see docs/adr/0002-cms.md decision 5 and docs/ops/cms-runbook.md step 5.'
    );
  }
}

/**
 * Locales are exactly `en` and `tr` — the short ISO 639-1 codes the App Router uses
 * (design/i18n.md). `en` is the default and is created by the i18n plugin on first boot
 * (pin it with STRAPI_PLUGIN_I18N_INIT_LOCALE_CODE=en). `tr` is seeded here so a fresh
 * database comes up bilingual without a manual admin step. Never `en-US` / `tr-TR`.
 */
async function ensureTurkishLocale(strapi: Core.Strapi): Promise<void> {
  const i18n = strapi.plugin('i18n');

  if (!i18n) {
    strapi.log.error('[bootstrap] i18n plugin is not enabled — the site is bilingual. Aborting locale seed.');
    return;
  }

  const locales = i18n.service('locales');
  const existing = await locales.findByCode(TURKISH_LOCALE.code);

  if (!existing) {
    await locales.create(TURKISH_LOCALE);
    strapi.log.info('[bootstrap] Seeded the "tr" locale.');
  }
}

/**
 * Editors get Strapi 5 CE's built-in **Editor** role (code `strapi-editor`): create,
 * update, publish, unpublish and delete on every collection type, plus the Media Library
 * and i18n — and no access to the Content-Type Builder or to role/user administration,
 * which stay with Super Admin (docs/ops/cms-runbook.md, "Adding an editor").
 *
 * Strapi CE ships this role and does not allow custom admin roles or edits to the default
 * ones (that is an Enterprise feature), so there is nothing to seed — only to assert it is
 * present. Operators are created by hand through the first-run register URL, per the
 * runbook; this never creates admin users.
 */
async function assertEditorRole(strapi: Core.Strapi): Promise<void> {
  const role = await strapi.db
    .query('admin::role')
    .findOne({ where: { code: 'strapi-editor' } });

  if (!role) {
    strapi.log.warn(
      '[bootstrap] Built-in Editor role (strapi-editor) not found. Assign editors to the ' +
        'Editor role in Settings > Administration Panel > Roles once it appears; do not ' +
        'give them Super Admin.'
    );
  }
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {
    assertProductionMediaStorage();
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureTurkishLocale(strapi);
    await assertEditorRole(strapi);
  },
};
