## Context

Timeline baseline #13 was reviewed and merged. Authority: ADRs 0001, 0003, 0004; design/motion.md; design/i18n.md. GSAP core, scrolltrigger and react skills are the implementation references. No CMS or infrastructure work.

## Goals / Non-Goals

L1 only on the dedicated English and Turkish timeline routes. Preserve server-rendered entries, native home section, keyboard navigation and static mobile/reduced-motion experience. No smooth-scroll system, card entrance effects, opacity hiding, animation of layout properties, or invented content.

## Decisions

A small route-local client wrapper keeps server-rendered children. Its effect checks desktop >=48rem, no reduced motion, an overflowing collection with multiple entries and enough viewport height before dynamically importing the engine. The engine dynamically imports GSAP/ScrollTrigger/@gsap/react and registers them only in the browser, then returns a scoped useGSAP component.

One gsap.matchMedia owns desktop/mobile/reduced-motion conditions. Eligible desktop pins the existing section and translates only its inner list horizontally, with linear scrub (no time-based lag or easing). Short/non-overflowing/tall content stays native. No content is hidden pending load. Arrow/tab focus or Escape restores the native scroller; links and hash destinations stay reachable. Cleanup reverts matchMedia, transforms, pin spacers and listeners on navigation. Font/image layout changes refresh safely; failure leaves native content.

The animation uses transform only. Pinning uses ScrollTrigger's layout bookkeeping, not layout-property tweens. Reduced motion and narrow screens get the original baseline with no imported animation engine. A live preference/size change reverts an already active engine. Neither home nor other routes import the wrapper.

## Budget

Machine limits remain 175KB first load and 45KB deferred. Before measurement: main timeline is 137.5KB first load / 0KB deferred locally. The route-local eligibility wrapper can add bootstrap bytes: measure the exact delta, and keep the unchanged-first-load acceptance item open if it increases. Never silently raise caps or characterize a positive delta as unchanged. The Turkish alias must get the same timeline cap, not a new L1 route.

## Risks / Verification

Async import after unmount, StrictMode duplication, reduced-motion changes, viewport resizing, image/font sizing, deep links and focused cards must retain a working baseline. Test both locales, zero/one/many records, import failure, narrow viewport, reduced motion, progress at fixed scroll offsets and navigation cleanup. Record actual browser scrolling for review; automated computed values do not judge feel.

## Rollback

Remove the route wrapper to restore the unchanged server timeline; records and home rendering are unaffected. Signature remains a draft until acceptance evidence and human motion review are available.
