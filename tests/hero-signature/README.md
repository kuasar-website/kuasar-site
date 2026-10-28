# Hero signature verification

Run root `npm ci`, `npm ci --prefix tests/hero-signature`, install Playwright Chromium
and Firefox, then `npm --prefix tests/hero-signature test`.

The fixture renders production Hero and HeroSignature with test-only actions and a
remount button. The sequence callback is attached only by this fixture. Both locales,
static fallbacks, failed imports, remount, Escape and offscreen pausing are covered.
Videos are fixture evidence, not a substitute for a production-home recording or human
review. Fixed-progress fixtures, hidden-document coverage and the same-base production
budget comparison remain open in the change tasks.

Local browser launch is blocked by the host sandbox (Chromium MachPort permission denied,
Firefox SIGABRT); no local browser pass is claimed.
