# 0001 — Stack, rendering rule, repository layout

- **Status:** Accepted
- **Date:** 2026-08-15
- **Supersedes:** nothing
- **Related:** [0002-cms.md](0002-cms.md), [0003-motion-stack.md](0003-motion-stack.md), [0004-verification.md](0004-verification.md)

Throughout this repository, `<DOMAIN>` stands for the registered apex domain. It is not
yet registered — see [0002-cms.md](0002-cms.md) and
[../ops/cms-runbook.md](../ops/cms-runbook.md). Replace every occurrence after
registration.

## Context

KUASAR is a student-founded space and rocketry team at Koç University, active since 2022.
This is its promotional and archival website — not an application. It serves two
audiences, neither ranked above the other: sponsors and partners, who need to reach
Connect Us or open the sponsorship PDF; and prospective members, who need to reach Join
Us. Everyone else — press, university, competition judges — is served by credibility
rather than by a call to action.

The constraints that actually shape the technical decisions are organisational, not
technical:

- Five contributors, one merge checker, peers reviewing each other's proposals.
- Annual turnover. Everyone who builds this will graduate. The site must outlive them.
- Agent-assisted development is assumed, so stack familiarity is not a selection
  criterion. The quality of available agent tooling for a stack *is* one.
- No hard launch deadline.
- A custom domain independent of the university: no university infrastructure
  requirement, no university brand rules, no approval process for the wordmark.

Every decision below is weighted toward what a member who joins in 2029 can pick up
without anyone to ask.

## Decision

### 1. Next.js 16 (App Router) with TypeScript, deployed on Vercel

Chosen over Astro deliberately. The team will lean on React-oriented agent skills; GSAP's
React integration is well-trodden and is vendored into this repository as a skill; and one
mental model beats island-boundary decisions for a rotating five-person team where the
person making the boundary call in March is not the person maintaining it in November.

The trade accepted is a heavier JavaScript baseline than a static-first framework would
give. That is not a free trade — it is precisely why the motion policy in
[0003-motion-stack.md](0003-motion-stack.md) is load-bearing rather than advisory, and why
[0004-verification.md](0004-verification.md) exists to enforce it. If the motion policy is
ever relaxed, this decision should be revisited rather than the policy.

`ASSUMPTION:` Next.js 16 is the current major as of August 2026. Pin the exact minor when
scaffolding and record it here. The revalidation API signature changed in 16 — see rule 2.

`ASSUMPTION:` pnpm workspaces, Node 22 LTS, pinned in `.nvmrc` and `engines`, and matched
in both Vercel and Render dashboards. A mismatch between local and deploy Node is a
recurring source of "works on my machine" in a rotating team.

### 2. Rendering: static generation with on-demand revalidation

User-facing routes are statically generated. A Strapi publish webhook triggers
revalidation of the affected tags. **User-facing routes never fetch Strapi in the request
path**, and no time-based revalidation is configured.

A sleeping or broken CMS must never be able to slow or break a page view. This is the
rule that makes a self-hosted CMS on a $7 instance an acceptable choice at all.

The revalidation endpoint is a route handler authorised by a shared secret. Note that
`revalidateTag` takes a second cache-profile argument on Next 16 (`revalidateTag(tag,
'max')`) where Next 15 took only the tag — copying a pre-16 example will typecheck and
silently under-revalidate. Pin the major, then match the signature.

**NEVER add a cron or time-based revalidation** to work around a consequence of this rule.
Any case that genuinely cannot be solved in the browser requires its own ADR.

### 3. All time-relative state is derived in the browser

This follows directly from rule 2 and is the single most easily forgotten consequence of
it. Static HTML is served unchanged until a webhook invalidates it. **Nothing fires when a
date simply passes.** A Summit page built in August still reads "upcoming" in December if
nobody published in between, and an upcoming-events list built in August contains August's
idea of upcoming, permanently.

Therefore:

- The server ships **raw ISO dates** and renders the **neutral form**.
- A client component computes past / live / upcoming after mount and applies status
  styling.
- Filtering and sorting by "now" happen client-side over the full shipped dataset.

This applies to Schedule, Galactic Summit, Timeline, and the semantic orange "live and
upcoming" states defined in [../../design/tokens.md](../../design/tokens.md). Render the
neutral state on the server so hydration does not mismatch.

### 4. Repository layout: one repository, two deploy targets

```
apps/web     → Next.js frontend, deploys to Vercel
apps/cms     → Strapi 5, deploys to Render
content/     → git-resident content (see 0002)
design/      → design documents
docs/        → ADRs and operational documents
```

The case for two repositories is real: a self-hosted CMS has its own database and its own
deploy lifecycle, and coupling them in one repository means a frontend PR and a CMS
migration share a history that neither needs.

It loses to a stronger argument. A five-person team with annual turnover has to hand over
whatever exists, and **one repository is one thing to explain**. Two repositories means
two sets of permissions, two CI configurations, two places to look for the answer, and one
of them will be forgotten within two cycles. The coupling costs a little noise in `git
log`; the split costs an entire artifact going unmaintained.

Both deploy targets are configured with a root directory so neither builds the other's
code.

### 5. Adding content is a data operation, never a code edit

**This requirement outranks stack preference.** Adding a new mission, talk, event, alumnus
or sponsor must require **adding data only** — never editing a component or a layout.

Future teams inherit this site. A layout that must be hand-edited to add a 2028 entry is a
layout that will be hand-edited badly, or not at all. Every collection must render
sensibly when it holds zero, one, or fifty entries. See
[../../design/content-model.md](../../design/content-model.md).

The one sanctioned exception is bounded and named in [0002-cms.md](0002-cms.md): Galactic
Summit's per-year presentation may vary within a fixed, code-defined set of options
selected as data.

### 6. Analytics: Vercel Web Analytics and Speed Insights, both

Speed Insights is the more important of the two. The entire tiered motion policy is a bet
that this site stays fast, and Speed Insights is the only thing that reports back from
real phones on real networks rather than from a developer's laptop. Without it the policy
is unfalsifiable.

Web Analytics is cookieless, which materially reduces KVKK exposure relative to Google
Analytics. A privacy notice is still required — recorded as debt in
[0002-cms.md](0002-cms.md).

Verified against the Hobby plan on 2026-08-15, answering the two questions the project
brief demanded be checked rather than assumed:

| | Hobby allowance | Behaviour when exceeded |
| --- | --- | --- |
| Web Analytics | 50,000 events / month | Collection pauses, resumes after 7 days |
| Speed Insights | 10,000 events / month, 1 project | Recording pauses until the next day |

**Custom events are available on Hobby** and count against the same 50,000 Web Analytics
allowance. So "did anyone open the sponsorship PDF" — the one commercially interesting
question this site can answer — is measurable from launch. Instrument it.

Both allowances are account-wide, not per project, and a Summit-week traffic spike can
plausibly exhaust either. The failure mode is badly timed: analytics go dark for up to
seven days during the exact week the data matters most. See Consequences.

Both scripts count against the JavaScript budget like anything else. No exemption — an
exemption here becomes the precedent for the next one. Note the limit of that enforcement:
the `@vercel/analytics` and `@vercel/speed-insights` wrapper components are in the route
bundle and are measured by the budget in [0004-verification.md](0004-verification.md); the
runtime scripts they fetch from `/_vercel/insights/` are not. CI covers most of the weight,
not all of it, and [0004-verification.md](0004-verification.md) says so rather than
implying full coverage.

**NEVER add third-party analytics, embeds, pixels or tag managers** until the KVKK
position is resolved and recorded. This includes embedding a Google Form; linking to one
is permitted, framing one is not.

## Consequences

**The build depends on Strapi even though the request path does not.** This is the honest
limit of rule 2, and stating it plainly is the point of writing it down. A Strapi outage
means "nobody can edit today" for *visitors*, but for *developers* it also means no deploy
completes — including a frontend-only hotfix that touches no CMS content at all. Rule 2
removes the runtime dependency; it does not remove the build-time one, and no amount of
static generation will.

`ASSUMPTION:` accepted as-is for now, on the grounds that Render Starter does not sleep and
outages should be rare. If it bites once, the mitigation is a build-time fallback to the
newest dump in the `content-snapshots` branch — the data is already there for backup
reasons, so the fallback is cheap to add later and should not be built speculatively.

**Vercel Hobby's commercial-use restriction is a live risk, not a formality.** Vercel's
terms restrict Hobby to non-commercial personal use, and lead-generation landing pages are
named as commercial. This site carries sponsor logos, a "Become a Partner" call to action
and a sponsorship PDF. Whether that constitutes commercial use is genuinely arguable, and
Vercel's own guidance for borderline cases is to ask their support team rather than guess.

Mitigation, in order: ask Vercel support in writing and record the answer in
[../HANDOVER.md](../HANDOVER.md); and treat the Galactic Summit as the deadline for
resolving it, since that is when both traffic and sponsor visibility peak. Upgrading to
Pro removes the question entirely along with both analytics ceilings, at $20/user/month
against a ~$15/month budget ceiling — so it is a decision to make deliberately and in
advance, not during Summit week.

**Hobby is single-seat.** Five contributors cannot all be members of a Hobby account. In
practice everyone deploys through GitHub rather than through the Vercel dashboard, which
is the correct workflow anyway, but it means dashboard access is a single point of
failure that [../HANDOVER.md](../HANDOVER.md) must name an owner and a backup for.

**Time-derived state is client-side, so it is invisible to static analysis and to
server-rendered snapshots.** Tests that assert "this event shows as upcoming" must run in a
browser with a controlled clock, not against server output.

## Alternatives considered

**Astro.** Lighter default JavaScript baseline, better suited to a content site on its
merits. Rejected on tooling and team-shape grounds rather than on output quality: the
vendored agent skills are React-oriented, GSAP's React integration is the well-trodden
path, and island boundaries are a recurring decision that a rotating team will make
inconsistently. The cost of this rejection is a heavier baseline, paid for by ADRs 0003
and 0004.

**Two repositories.** Cleaner lifecycle separation, genuinely better on the engineering
merits. Rejected on handover legibility, per rule 4.

**Time-based ISR.** Would make time-relative state work without client-side derivation and
would remove the build-time coupling concern. Rejected: it reintroduces a scheduled
rebuild, couples freshness to a timer nobody will remember exists, and burns build minutes
on a site that changes a few times a month. The client-side derivation rule is strictly
better for a site whose content is mostly immutable once published.

**Vercel Pro from the start.** Removes the commercial-use question, both analytics
ceilings, and the single-seat limitation. Rejected for launch on budget grounds, with an
explicit revisit trigger rather than an open-ended deferral.
