import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import gsapCleanup from "./eslint-rules/gsap-cleanup.mjs";
import gsapReducedMotion from "./eslint-rules/gsap-reduced-motion.mjs";

// --- The import-graph rule (docs/adr/0004-verification.md, design.md's
// "The import-graph rule needs no new ESLint plugin") -----------------------
//
// ADR 0004 says "ESLint no-restricted-imports with path zones," which core
// ESLint doesn't literally support (that shape belongs to
// eslint-plugin-import's no-restricted-paths). The requirement decomposes
// into two core-ESLint rules instead:
//
//   1. Static import of gsap / @gsap/react / a GSAP plugin is disallowed
//      everywhere, including inside the eventual L1 routes — design/motion.md
//      caps first-load JS on L1 routes exactly as on every other route, so a
//      static import is wrong there too.
//   2. Dynamic import(...) of the same specifiers is disallowed everywhere
//      EXCEPT inside the two L1 route segments, where it is turned back off.
//
// GSAP plugins are submodules of the `gsap` package itself (e.g.
// `gsap/ScrollTrigger`), never separate npm packages, so `gsap/*` covers
// "any GSAP plugin" without naming each one.
const GSAP_RESTRICTED_MESSAGE =
  "gsap, @gsap/react and GSAP plugins may only be dynamically imported, and only from the home hero route or /[locale]/timeline. See design/motion.md.";

// Matches an ImportExpression (`import(...)`) whose literal source is
// `gsap`, `gsap/<plugin>`, or `@gsap/react`.
const GSAP_DYNAMIC_IMPORT_SELECTOR =
  "ImportExpression[source.type='Literal'][source.value=/^(gsap(\\/.*)?|@gsap\\/react)$/]";

const localPlugin = {
  rules: {
    "gsap-cleanup": gsapCleanup,
    "gsap-reduced-motion": gsapReducedMotion,
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { local: localPlugin },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "gsap", message: GSAP_RESTRICTED_MESSAGE },
            { name: "@gsap/react", message: GSAP_RESTRICTED_MESSAGE },
          ],
          patterns: [{ group: ["gsap/*"], message: GSAP_RESTRICTED_MESSAGE }],
        },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: GSAP_DYNAMIC_IMPORT_SELECTOR, message: GSAP_RESTRICTED_MESSAGE },
      ],
      // Any file importing "gsap" must clean up via useGSAP or
      // gsap.context(...).revert() — docs/adr/0004-verification.md.
      "local/gsap-cleanup": "error",
      // Any file creating a gsap tween/timeline must branch through
      // gsap.matchMedia().add(...) with a reduced-motion query —
      // docs/adr/0004-verification.md, spec.md's "GSAP code with no
      // matchMedia reduced-motion branch fails" scenario.
      "local/gsap-reduced-motion": "error",
    },
  },
  {
    // The "path zone" exception: the two L1 route segments named in
    // design/motion.md may import GSAP dynamically. Neither directory
    // exists yet — locale routing has not landed (see design.md's Context)
    // — so these globs are written against the route paths design/motion.md
    // specifies for when that structure exists, not against a real one:
    //
    //  - The home hero route, `/[locale]`: files colocated directly inside
    //    app/[locale]/ (e.g. app/[locale]/page.tsx), plus any Next.js
    //    private folder (an `_`-prefixed segment, which Next.js excludes
    //    from routing) nested under it. Deliberately NOT app/[locale]/**
    //    recursively — that would also exempt sibling routes nested under
    //    the locale segment, such as the eventual /[locale]/missions, which
    //    are not L1.
    //  - /[locale]/timeline: the whole app/[locale]/timeline/ subtree — this
    //    route has no sibling routes nested under it to accidentally exempt.
    files: [
      "app/\\[locale\\]/*.{js,jsx,ts,tsx}",
      "app/\\[locale\\]/_*/**/*.{js,jsx,ts,tsx}",
      "app/\\[locale\\]/timeline/**/*.{js,jsx,ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
