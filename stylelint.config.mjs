/**
 * Repository-wide Stylelint config for Tier A's static motion checks (see
 * docs/adr/0004-verification.md). Root-level rather than per-workspace:
 * unlike typecheck/lint, Stylelint has no npm-workspace concept to key off,
 * and the checks it runs (property allow-list, duration tokens) apply to
 * any CSS anywhere in the repo, not to one app's runtime.
 */
export default {
  extends: ["stylelint-config-standard"],
  plugins: ["./stylelint-rules/motion.mjs"],
  rules: {
    "kuasar/motion-property-allowed-list": true,
    "kuasar/motion-duration-token": true,
    // stylelint-config-standard predates Tailwind v4's CSS-native
    // `@theme`/`@import "tailwindcss"` syntax and doesn't recognize it.
    // ADR 0004's Tier A table names only the two motion rules above as a
    // CI gate — stylelint-config-standard is here as a sane baseline, not
    // as its own enforced gate — so the three rules below are disabled
    // rather than left failing on syntax this project's real stack (see
    // docs/adr/0001-stack.md) uses deliberately:
    //   - import-notation: flags `@import "tailwindcss"` in favor of
    //     `@import url(...)` — that's Tailwind's documented entry point.
    //   - color-hex-length: a long-vs-short hex stylistic preference,
    //     unrelated to motion; design/tokens.md moves colour to oklch()
    //     separately.
    //   - at-rule-no-unknown: Tailwind v4's own at-rules
    //     (@theme/@utility/@variant/@custom-variant/@apply/@config/
    //     @plugin/@reference/@source), which standard CSS tooling has no
    //     way to already know about.
    "import-notation": null,
    "color-hex-length": null,
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "theme",
          "utility",
          "variant",
          "custom-variant",
          "apply",
          "config",
          "plugin",
          "reference",
          "source",
          "tailwind",
        ],
      },
    ],
  },
};
