/**
 * Project-local ESLint rule: any file importing "gsap" must either call
 * useGSAP (from @gsap/react) or pair a gsap.context(...) call with a
 * matching .revert() call somewhere in the same file.
 *
 * Registered as a local flat-config plugin from eslint.config.mjs, per
 * ESLint's documented mechanism for project-local rules. Written as a
 * one-off rather than sourced from a published plugin: no published rule
 * checks this narrow, project-specific shape — see design.md ("GSAP
 * cleanup check: a small local ESLint rule, not a plugin search") in
 * openspec/changes/verification-gates.
 *
 * Like the other static motion checks in docs/adr/0004-verification.md,
 * this is an approximation: it looks for the *shape* of the two accepted
 * cleanup patterns anywhere in the file, not that the cleanup call is
 * correctly wired to run on unmount, or scoped to the exact
 * gsap.context(...) call it is paired with. It catches the common case —
 * forgetting cleanup entirely.
 */

const GSAP_IMPORT_SOURCE = /^gsap$/;

/** @type {import("eslint").Rule.RuleModule} */
const gsapCleanupRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require useGSAP() or gsap.context(...).revert() in any file that imports gsap.",
    },
    schema: [],
    messages: {
      missingCleanup:
        'This file imports "gsap" but calls neither useGSAP() nor pairs gsap.context(...) with .revert(). See docs/adr/0004-verification.md.',
    },
  },
  create(context) {
    let gsapImportNode = null;
    let hasUseGSAPCall = false;
    let hasGsapContextCall = false;
    let hasRevertCall = false;

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
      CallExpression(node) {
        const { callee } = node;
        if (callee.type === "Identifier" && callee.name === "useGSAP") {
          hasUseGSAPCall = true;
          return;
        }
        if (
          callee.type === "MemberExpression" &&
          !callee.computed &&
          callee.property.type === "Identifier"
        ) {
          if (callee.property.name === "context") {
            hasGsapContextCall = true;
          } else if (callee.property.name === "revert") {
            hasRevertCall = true;
          }
        }
      },
      "Program:exit"() {
        if (gsapImportNode === null) return;
        const hasCleanup =
          hasUseGSAPCall || (hasGsapContextCall && hasRevertCall);
        if (!hasCleanup) {
          context.report({ node: gsapImportNode, messageId: "missingCleanup" });
        }
      },
    };
  },
};

export default gsapCleanupRule;
