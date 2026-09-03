/**
 * Repository-local Stylelint plugin: the two per-declaration static motion
 * checks from docs/adr/0004-verification.md that no built-in Stylelint rule
 * expresses — see design.md ("CSS static checks") in
 * openspec/changes/verification-gates. Neither built-in rule nor a
 * third-party plugin can reliably catch a violation hidden inside the
 * `transition`/`animation` shorthand (e.g. `transition: width 200ms`), which
 * is exactly the failure mode that matters most, so both rules here
 * tokenize shorthand values with postcss-value-parser rather than pattern-
 * matching the raw string.
 *
 * Two rules:
 *   - kuasar/motion-property-allowed-list — no animation of layout-
 *     triggering properties (design/motion.md's "Properties" section;
 *     ADR 0004's static check 3).
 *   - kuasar/motion-duration-token — durations must reference
 *     var(--duration-*): never a literal, never a token from some other
 *     family, and never simply absent from a declaration that describes
 *     real motion (design/tokens.md's "No raw time values in animations"
 *     rule; ADR 0004's static check 4).
 */

import valueParser from "postcss-value-parser";
import stylelint from "stylelint";

const { createPlugin, utils } = stylelint;
const { report, ruleMessages, validateOptions } = utils;

const ALLOWED_PROPERTIES = new Set(["transform", "opacity"]);

// Components of the `transition`/`animation` shorthand that are never a
// property name or an animation name: easing keywords, CSS-wide keywords,
// and the literal "none" (a legal value on both shorthands meaning "nothing
// transitions" / "no animation applies").
const NON_PROPERTY_KEYWORDS = new Set([
  "ease",
  "linear",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "step-start",
  "step-end",
  "initial",
  "inherit",
  "unset",
  "revert",
  "revert-layer",
  "none",
]);

// `animation`-only shorthand components that are never the animation name:
// iteration count's "infinite", direction, fill-mode, and play-state
// keywords. Combined with NON_PROPERTY_KEYWORDS and a bare-number check
// (the numeric iteration count) when looking for an animation shorthand's
// name component.
const ANIMATION_NON_NAME_KEYWORDS = new Set([
  "infinite",
  "normal",
  "reverse",
  "alternate",
  "alternate-reverse",
  "forwards",
  "backwards",
  "both",
  "running",
  "paused",
]);

const NO_EXTRA_KEYWORDS = new Set();

// A CSS-wide keyword as the *entire* value of a long-hand
// transition-duration/animation-duration declaration. Legitimate — it
// defers to the cascade rather than stating a duration — so it is the one
// exception to "every long-hand duration value must be a var(--duration-*)
// token."
const WHOLE_VALUE_KEYWORDS = new Set([
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
]);

// A literal time value: "200ms", "0.3s", "1s" — never a bare number, since
// CSS requires a unit on every non-zero time value.
const TIME_LITERAL = /^[+-]?(\d+\.?\d*|\.\d+)m?s$/i;

// A bare number, e.g. the animation shorthand's iteration count.
const BARE_NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/;

// The accepted duration-token family, from design/tokens.md.
const DURATION_TOKEN = /^--duration-/;

// The easing-token family — also design/tokens.md, and also legally a
// var(...) call inside a transition/animation shorthand, in the timing-
// function slot rather than the duration slot. Recognized only so the
// duration rule can tell "this var() is the easing component, not this
// rule's concern" apart from "this var() is standing in the duration slot
// and isn't a duration token." Only relevant to shorthand parsing — a
// long-hand transition-duration/animation-duration declaration has no
// timing-function slot at all, so var(--ease-*) there is simply wrong, not
// exempt. See checkDurationGroup's "mode" parameter.
const EASING_TOKEN = /^--ease-/;

/**
 * Split value-parser's top-level nodes into comma-separated groups (one
 * group per `<single-transition>` / `<single-animation>`), dropping
 * whitespace and comma "div" nodes. Deliberately shallow — cubic-bezier(...)
 * and var(...) stay as single function nodes rather than being walked into,
 * since their arguments are never a property name or a bare duration.
 */
function splitIntoGroups(nodes) {
  const groups = [[]];

  for (const node of nodes) {
    if (node.type === "div" && node.value === ",") {
      groups.push([]);
      continue;
    }

    if (node.type === "space" || node.type === "comment") continue;

    groups.at(-1).push(node);
  }

  return groups;
}

/** The name argument of a `var(...)` function node, e.g. "--duration-base". */
function getVarArgumentName(functionNode) {
  const argument = functionNode.nodes.find((node) => node.type === "word");

  return argument?.value;
}

/**
 * Word nodes in a group that are candidates for "the name this group is
 * really about" — a transition's animated property, or an animation's
 * animation-name — after excluding time literals, bare numbers, and every
 * keyword that belongs to some other shorthand component instead.
 */
function findNameCandidates(group, extraNonNameKeywords) {
  return group.filter(
    (node) =>
      node.type === "word" &&
      !TIME_LITERAL.test(node.value) &&
      !BARE_NUMBER.test(node.value) &&
      !NON_PROPERTY_KEYWORDS.has(node.value.toLowerCase()) &&
      !extraNonNameKeywords.has(node.value.toLowerCase()),
  );
}

// --- kuasar/motion-property-allowed-list ------------------------------

const propertyRuleName = "kuasar/motion-property-allowed-list";

const propertyMessages = ruleMessages(propertyRuleName, {
  rejected: (property) =>
    `Unexpected property "${property}" in an animation/transition — only "transform" and "opacity" skip layout and paint. See design/motion.md.`,
});

const motionPropertyAllowedList = (primary) => {
  return (root, result) => {
    const validOptions = validateOptions(result, propertyRuleName, {
      actual: primary,
      possible: [true],
    });

    if (!validOptions) return;

    function checkPropertyNode(decl, propertyName) {
      if (!ALLOWED_PROPERTIES.has(propertyName.toLowerCase())) {
        report({
          message: propertyMessages.rejected,
          messageArgs: [propertyName],
          node: decl,
          word: propertyName,
          result,
          ruleName: propertyRuleName,
        });
      }
    }

    root.walkDecls(/^transition(-property)?$/i, (decl) => {
      const parsed = valueParser(decl.value);
      const groups = splitIntoGroups(parsed.nodes);

      for (const group of groups) {
        for (const candidate of findNameCandidates(group, NO_EXTRA_KEYWORDS)) {
          checkPropertyNode(decl, candidate.value);
        }
      }
    });

    root.walkAtRules(/^(-\w+-)?keyframes$/i, (keyframesRule) => {
      keyframesRule.walkDecls((decl) => {
        checkPropertyNode(decl, decl.prop);
      });
    });
  };
};

motionPropertyAllowedList.ruleName = propertyRuleName;
motionPropertyAllowedList.messages = propertyMessages;

// --- kuasar/motion-duration-token --------------------------------------

const durationRuleName = "kuasar/motion-duration-token";

const durationMessages = ruleMessages(durationRuleName, {
  literal: (value) =>
    `Literal duration "${value}" — durations must reference a var(--duration-*) token, never a literal. See design/tokens.md.`,
  wrongToken: (value) =>
    `Duration references "var(${value})", which is not a "--duration-*" token. See design/tokens.md.`,
  missing: () =>
    `No var(--duration-*) reference found — a duration must be stated explicitly as a token, not left to the implicit 0s default. See design/tokens.md.`,
});

/**
 * Check one comma-separated group (one `<single-transition>` /
 * `<single-animation>`, or one item of a long-hand duration list) for a
 * valid var(--duration-*) reference.
 *
 * @param {"longhand" | "shorthand"} mode
 */
function checkDurationGroup(decl, group, result, mode) {
  let hasValidDurationToken = false;
  let hasDurationAttempt = false;

  for (const node of group) {
    if (node.type === "word" && TIME_LITERAL.test(node.value)) {
      hasDurationAttempt = true;
      report({
        message: durationMessages.literal,
        messageArgs: [node.value],
        node: decl,
        word: node.value,
        result,
        ruleName: durationRuleName,
      });
      continue;
    }

    if (node.type === "function" && node.value.toLowerCase() === "var") {
      const argumentName = getVarArgumentName(node);

      if (argumentName === undefined) continue;

      // Only the shorthand has a timing-function slot for var(--ease-*) to
      // legitimately occupy; on a long-hand duration declaration every
      // var() call is claiming to be a duration, full stop.
      if (mode === "shorthand" && EASING_TOKEN.test(argumentName)) continue;

      hasDurationAttempt = true;

      if (DURATION_TOKEN.test(argumentName)) {
        hasValidDurationToken = true;
      } else {
        report({
          message: durationMessages.wrongToken,
          messageArgs: [argumentName],
          node: decl,
          word: argumentName,
          result,
          ruleName: durationRuleName,
        });
      }
    }
  }

  if (hasValidDurationToken || hasDurationAttempt) return;

  // Nothing duration-shaped was found at all — a literal or wrong-token
  // var() would already have been reported above. Decide whether that
  // silence is a legitimate "no motion here" case or a missing duration.
  if (mode === "longhand") {
    const isWholeValueKeyword =
      group.length === 1 &&
      group[0].type === "word" &&
      WHOLE_VALUE_KEYWORDS.has(group[0].value.toLowerCase());

    if (isWholeValueKeyword) return;
  } else {
    const extraKeywords =
      decl.prop.toLowerCase() === "animation"
        ? ANIMATION_NON_NAME_KEYWORDS
        : NO_EXTRA_KEYWORDS;
    const describesMotion = findNameCandidates(group, extraKeywords).length > 0;

    if (!describesMotion) return;
  }

  report({
    message: durationMessages.missing,
    node: decl,
    result,
    ruleName: durationRuleName,
  });
}

const motionDurationToken = (primary) => {
  return (root, result) => {
    const validOptions = validateOptions(result, durationRuleName, {
      actual: primary,
      possible: [true],
    });

    if (!validOptions) return;

    function checkDecl(decl, mode) {
      const parsed = valueParser(decl.value);
      const groups = splitIntoGroups(parsed.nodes);

      for (const group of groups) {
        checkDurationGroup(decl, group, result, mode);
      }
    }

    // Long-hand: transition-duration / animation-duration — the entire
    // value is duration(s), so every group must resolve to var(--duration-*)
    // (or be the sole CSS-wide keyword — see WHOLE_VALUE_KEYWORDS).
    root.walkDecls(/^(transition|animation)-duration$/i, (decl) =>
      checkDecl(decl, "longhand"),
    );

    // Shorthand: transition / animation — a group that names a real
    // property (transition) or a real animation-name (animation) must
    // resolve to var(--duration-*) too; a group with no such name (e.g.
    // `none`, or a bare CSS-wide keyword) has no motion to time at all.
    root.walkDecls(/^(transition|animation)$/i, (decl) =>
      checkDecl(decl, "shorthand"),
    );
  };
};

motionDurationToken.ruleName = durationRuleName;
motionDurationToken.messages = durationMessages;

export default [
  createPlugin(propertyRuleName, motionPropertyAllowedList),
  createPlugin(durationRuleName, motionDurationToken),
];
