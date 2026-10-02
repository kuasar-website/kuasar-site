## 1. Foundations
- [x] 1.1 Verify merged/reviewed baseline and read authority plus GSAP core/ScrollTrigger/React skills.
- [x] 1.2 Declare/install the single GSAP ecosystem and align import/budget gates with the existing two localized timeline routes.

## 2. Progressive enhancement
- [x] 2.1 Implement a route-only deferred desktop engine using scoped useGSAP, contextSafe callbacks and a single matchMedia for desktop/mobile/reduced motion.
- [ ] 2.2 Preserve native SSR/mobile/reduced-motion/error behavior, keyboard and hash access, and cleanup on unmount/resize; keep home native in both locales.

## 3. Verification and review
- [x] 3.1 Add dedicated Tier B deterministic browser checks for both locales, zero/one/fifty, import failure, progress, preference changes and repeated navigation cleanup.
- [ ] 3.2 Pass Tier A and baseline/time-state regression checks; measure <=45KB deferred and <=175KB first load on both routes.
- [ ] 3.3 Compare first-load against main and satisfy the task's unchanged-first-load acceptance criterion; report any positive delta rather than silently accepting it.
- [ ] 3.4 Run the manual /review-animations review (if installed), attach a screen recording and obtain human motion acceptance before marking ready.
