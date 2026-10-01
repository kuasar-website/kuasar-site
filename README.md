# content-snapshots

Weekly, automated export of published, non-Alumni Strapi content —
see docs/adr/0002-cms.md decision 2 and docs/ops/cms-runbook.md,
step 8, on `main`.

This branch is written only by `.github/workflows/content-snapshot.yml`.
Do not commit to it by hand; a manual snapshot is triggered from the
Actions tab ("Run workflow"), never by editing this branch directly.

Content only, never media, never drafts, never Alumni. See the
runbook for how to restore.
