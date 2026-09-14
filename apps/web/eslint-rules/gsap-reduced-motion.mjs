/**
 * Project-local ESLint rule: any file importing "gsap" that creates a
 * tween or a timeline must branch through gsap.matchMedia() with a
 * reduced-motion case somewhere in the same file.
 *
 * Registered as a local flat-config plugin from eslint.config.mjs, per
 * ESLint's documented mechanism for project-local rules — parallel to
 * ./gsap-cleanup.mjs. Covers the GSAP half of ADR 0004's "every animation
 * has a reduced-motion path" static check (spec.md's "GSAP code with no
 * matchMedia reduced-motion branch fails" scenario); the CSS half is
 * scripts/checks/reduced-motion-css.mjs. Neither a built-in ESLint rule nor
 * a published GSAP-aware plugin covers this narrow, project-specific
 * shape — see design.md ("GSAP cleanup check: a small local ESLint rule,
 * not a plugin search") in openspec/changes/verification-gates, which this
 * rule follows the same reasoning as.
 *
 * Like the other static motion checks in docs/adr/0004-verification.md,
 * this is an approximation, but a deliberately narrow one on both sides:
 *   - A "tween" is only ever gsap.to/from/fromTo/set/timeline(...), or the
 *     same methods called on an identifier the file itself created from
 *     gsap.timeline(...) (by variable, or chained directly). A bare
 *     `.to()`/`.set()` on anything else — Map#set, a state setter, an
 *     unrelated fluent API — is never mistaken for a GSAP tween.
 *   - The reduced-motion branch is only satisfied if a string naming
 *     "prefers-reduced-motion" actually flows into an `.add(...)` call on
 *     a gsap.matchMedia() instance — not merely present somewhere else in
 *     the file. A "prefers-reduced-motion" string that never reaches
 *     matchMedia().add(...) does not satisfy this rule.
 * It still does not verify that the flagged tween is itself *inside* that
 * branch — that's beyond what a narrow, project-specific static check
 * covers; it catches the common case, which is forgetting the branch
 * entirely.
 */

const GSAP_IMPORT_SOURCE = /^gsap$/;

const TWEEN_OR_TIMELINE_METHODS = new Set(["to", "from", "fromTo", "set", "timeline"]);

const REDUCED_MOTION_LITERAL = /prefers-reduced-motion/i;

function isGsapIdentifier(node) {
  return node.type === "Identifier" && node.name === "gsap";
}

/** Matches `gsap.timeline(...)`. */
function isGsapTimelineCreation(node) {
  return (
    node.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    !node.callee.computed &&
    isGsapIdentifier(node.callee.object) &&
    node.callee.property.type === "Identifier" &&
    node.callee.property.name === "timeline"
  );
}

/** Matches `gsap.matchMedia(...)`. */
function isGsapMatchMediaCreation(node) {
  return (
    node.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    !node.callee.computed &&
    isGsapIdentifier(node.callee.object) &&
    node.callee.property.type === "Identifier" &&
    node.callee.property.name === "matchMedia"
  );
}

/**
 * Does this argument expression contain a "prefers-reduced-motion"
 * string? Handles both matchMedia().add() call shapes GSAP documents: a
 * plain query string, and an options object whose property values are
 * query strings (e.g. `{ reduceMotion: "(prefers-reduced-motion: reduce)" }`).
 */
function containsReducedMotionLiteral(node, seen) {
  if (!node || seen.has(node)) return false;
  seen.add(node);

  if (node.type === "Literal" && typeof node.value === "string") {
    return REDUCED_MOTION_LITERAL.test(node.value);
  }

  if (node.type === "ObjectExpression") {
    return node.properties.some(
      (property) =>
        property.type === "Property" && containsReducedMotionLiteral(property.value, seen),
    );
  }

  return false;
}

/** @type {import("eslint").Rule.RuleModule} */
const gsapReducedMotionRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require gsap.matchMedia().add(...) with a reduced-motion query in any file that creates a gsap tween or timeline.",
    },
    schema: [],
    messages: {
      missingReducedMotionBranch:
        'This file imports "gsap" and creates a tween or timeline but never branches through gsap.matchMedia().add(...) with a reduced-motion query. See docs/adr/0004-verification.md.',
    },
  },
  create(context) {
    let gsapImportNode = null;
    let tweenOrTimelineCallNode = null;
    let hasReducedMotionBranch = false;

    const timelineInstanceNames = new Set();
    const matchMediaInstanceNames = new Set();

    function noteGsapImport(node, sourceNode) {
      if (
        gsapImportNode === null &&
        sourceNode.type === "Literal" &&
        typeof sourceNode.value === "string" &&
        GSAP_IMPORT_SOURCE.test(sourceNode.value)
      ) {
        gsapImportNode = node;
      }
    }

    return {
      ImportDeclaration(node) {
        noteGsapImport(node, node.source);
      },
      ImportExpression(node) {
        noteGsapImport(node, node.source);
      },

      // Track `const tl = gsap.timeline()` / `const mm = gsap.matchMedia()`
      // so a later `tl.to(...)` / `mm.add(...)` is recognized without
      // requiring the chained-call form.
      VariableDeclarator(node) {
        if (!node.init || node.id.type !== "Identifier") return;

        if (isGsapTimelineCreation(node.init)) {
          timelineInstanceNames.add(node.id.name);
        } else if (isGsapMatchMediaCreation(node.init)) {
          matchMediaInstanceNames.add(node.id.name);
        }
      },

      CallExpression(node) {
        const { callee } = node;

        if (callee.type !== "MemberExpression" || callee.computed) return;
        if (callee.property.type !== "Identifier") return;

        const objectIsGsap = isGsapIdentifier(callee.object);
        const objectIsTimelineInstance =
          callee.object.type === "Identifier" &&
          timelineInstanceNames.has(callee.object.name);
        const objectIsTimelineChain = isGsapTimelineCreation(callee.object);

        if (
          tweenOrTimelineCallNode === null &&
          TWEEN_OR_TIMELINE_METHODS.has(callee.property.name) &&
          (objectIsGsap || objectIsTimelineInstance || objectIsTimelineChain)
        ) {
          tweenOrTimelineCallNode = node;
        }

        if (callee.property.name === "add" && !hasReducedMotionBranch) {
          const objectIsMatchMediaInstance =
            callee.object.type === "Identifier" &&
            matchMediaInstanceNames.has(callee.object.name);
          const objectIsMatchMediaChain = isGsapMatchMediaCreation(callee.object);

          if (objectIsMatchMediaInstance || objectIsMatchMediaChain) {
            const [firstArgument] = node.arguments;

            if (
              firstArgument &&
              containsReducedMotionLiteral(firstArgument, new Set())
            ) {
              hasReducedMotionBranch = true;
            }
          }
        }
      },

      "Program:exit"() {
        if (gsapImportNode === null || tweenOrTimelineCallNode === null) return;

        if (!hasReducedMotionBranch) {
          context.report({
            node: tweenOrTimelineCallNode,
            messageId: "missingReducedMotionBranch",
          });
        }
      },
    };
  },
};

export default gsapReducedMotionRule;
