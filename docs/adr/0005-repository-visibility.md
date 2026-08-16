# 0005 — The repository is public

- **Status:** Accepted
- **Date:** 2026-08-16
- **Supersedes:** nothing
- **Amends:** [0004-verification.md](0004-verification.md) — its cost constraint and its
  merge-control assumption
- **Related:** [0002-cms.md](0002-cms.md), [../HANDOVER.md](../HANDOVER.md),
  [../ops/cms-runbook.md](../ops/cms-runbook.md)

## Context

[0004-verification.md](0004-verification.md) was written against a private repository, and
two of its shapes come directly from that:

- Its whole two-tier gate structure exists to fit **2,000 free GitHub Actions minutes per
  month**, which is what a private repository on GitHub Free gets.
- Its merge-control section assumed `main` could be protected with required reviews and
  required status checks, and asked for that to be confirmed.

It has now been confirmed, and the answer is no. GitHub's availability is that rulesets and
branch protection work on **public** repositories on every plan including Free, but on
**private** repositories only with GitHub Pro, Team or Enterprise. `kuasar-website` is an
organisation, so Pro does not apply and Team is the entry point, at $4/user/month — about
$20/month for five contributors, against a stated budget ceiling of ~$15/month for the
entire project.

So the private repository was costing us two things at once: the enforcement ADR 0004 wanted
and could not have, and a CI minute ceiling that shaped the design of every gate in it.

Public costs nothing and removes both.

## Decision

**This repository is public.**

Three things follow immediately, and all three are free:

1. **Branch protection on `main` becomes available.** Required review from the merge
   checker and required status checks for Tier A and Tier B are enforceable rather than
   conventional. The assumption in [0004-verification.md](0004-verification.md) resolves to
   "available", and its stated fallback — the pull request template as the only enforcement
   — does not need to be taken.
2. **GitHub Actions minutes become unlimited.** Standard GitHub-hosted runners are free on
   public repositories with no monthly allowance. The binding constraint that ADR 0004
   names in its first paragraph no longer binds.
3. **The visibility flip should happen now, before there is anything to leak.** The
   repository currently holds documentation and three commits. Auditing that history for
   secrets takes minutes today and becomes a real piece of work once `apps/cms` exists with
   its environment handling. The cheapest moment to become public is the one where there is
   nothing in the history yet. The sequence is
   [../ops/cms-runbook.md](../ops/cms-runbook.md) **step 0**.

**Status of the flip itself: decided, not yet done.** As of 2026-08-16 the repository is
still private. This ADR records the decision; runbook step 0 is the action, and it is
unstarted. Do not read the present tense above as a description of the current state of
GitHub.

Nothing that must stay secret was ever supposed to be in this repository. Secrets live in
the Vercel and Render dashboards — [../ops/cms-runbook.md](../ops/cms-runbook.md) step 4
lists them, and [../HANDOVER.md](../HANDOVER.md) already states they are never committed.
Public visibility does not change that rule; it changes the penalty for breaking it.

### What CI tiering rests on now

ADR 0004's two tiers **survive this decision**, but on a different argument, and the
difference matters to whoever reconsiders it later.

The old argument was cost: a full browser matrix on every push does not fit 2,000 minutes.
That argument is gone. The remaining argument is **latency** — running a ten-minute browser
matrix on every push means every push costs ten minutes of waiting, and a gate developers
route around is worse than no gate. Path filtering, likewise, is now about feedback speed
rather than about preserving a budget.

This is a weaker argument than the one it replaces, and it is stated as weaker on purpose.
If the team later decides it would rather wait than miss a regression on a feature branch,
the budget objection is no longer there to stop them. That is now a preference, not a
constraint.

## Consequences

**The snapshots have to be filtered, and one of the filters costs a backup.** This is the
real cost of the decision and it is not hypothetical. The weekly export in
[0002-cms.md](0002-cms.md) commits Strapi content into this repository, and Strapi's export
takes everything unless restricted.

Note what the problem is *not*. Published content appearing in a public repository is not an
exposure — it is on the website already. The problem is **permanence**: a public git history
cannot be erased, so anything committed to it is committed for good. Privately that is an
awkward force-push; publicly it cannot be undone at all.

[0002-cms.md](0002-cms.md) therefore carries two hard requirements, and both must be verified
**before** visibility is flipped:

- **Published entries only.** Drafts are genuinely not public today, so they would be a new
  exposure.
- **Alumni excluded entirely.** Alumni are the entity most likely to generate an erasure
  request, and this project cannot honour one against a public git history. The price is that
  alumni records end up with no backup — accepted, argued, and recorded as a consequence in
  0002 rather than discovered later.

This is the sharpest edge of going public: it did not merely change where content is
readable, it removed a backup the project would otherwise have had.

**A committed secret is public the instant it lands, not whenever someone notices.** The
mitigation is ordinary: push protection and secret scanning are free on public repositories
and should be switched on in the same sitting as the visibility change. Rotation, not
deletion, is the response to a leak — the commit is already cloned.

**Mistakes are visible.** A rotating team of five learning in public will have half-finished
work and bad commit messages on display. This is a real cost and it is small; it is also
arguably a benefit for a student club whose site exists to establish credibility, and it
gives prospective members somewhere to see how the team works.

**The `content-snapshots` branch is now discoverable by anyone**, which slightly softens the
weakness [0002-cms.md](0002-cms.md) records about backups being invisible from a normal
clone. It does not remove it — the branch still does not appear in a default clone. The
handover documents remain the only real fix.

**GitHub Team stops being on the roadmap.** The $20/month it would have cost was for
branch protection alone, which is now free. If Team is ever bought, it must be for a
different reason, argued fresh.

## Alternatives considered

**Stay private, pay for GitHub Team.** $4/user/month, roughly $20/month for five, against a
~$15/month ceiling for the whole project. It would more than double the running cost of the
site to buy one gate, and the cost recurs forever while the gate's value does not grow.
Rejected on budget, and because a recurring per-seat cost is exactly the kind of obligation
that lapses when the person who set up the billing graduates.

**Stay private, enforce by convention.** Free, honest, and already written into ADR 0004 as
its fallback. Rejected because it leaves the 2,000-minute ceiling in place as well, so it
solves neither problem, and because convention is precisely what annual turnover erodes —
the merge checker in 2029 will not know a convention existed.

**Stay private, keep everything as written.** Rejected: it requires believing the assumption
that was just checked and found false. The document would keep asserting protection that
does not exist.
