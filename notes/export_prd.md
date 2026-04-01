# Utilization Export & Capacity Dashboard

## Background

Hoffmann Bros (HB Solutions Group) raised this directly with Melisa. Their marketing team and external ad agency (Tinuiti) need to adjust paid ad budgets in real-time based on capacity — but today there's no easy way to export or share utilization data across tenants and business units. Justin Schmidt (Sr. Director of Performance Marketing) uses the utilization view every day; the gap is exportability and summarization, not the underlying data.

Pilot: HB Nashville tenant first, then broader rollout.

---

## Problem

No exportable, shareable view of capacity/utilization across tenants and business units. The team is doing this manually — selecting each BU one by one and relaying info to their agency several times a day.

---

## What They're Asking For

**1. Historical utilization**
Daily utilization per tenant per business unit, defined as:
`total shift hours booked / total shift hours available`

**2. Forward-looking capacity view**
Average % booked of total available capacity for the next 3 / 5 / 10 days, per tenant per business unit.

**3. Exportable / shareable output**
Dashboards and auto-generated reports that can be shared daily with internal stakeholders and the ad agency.

---

## Why It Matters

HB wants to wire utilization data directly to ad spend rules. Example logic they'd implement on their end:

- >115% booked → reduce ad spend to 70% of budget
- 100–115% → reduce to 85%
- 80–100% → maintain at 100%
- 70–80% → increase to 110%
- 60–70% → increase to 120%
- <60% → increase to 130%

This is a clean, high-value use case and Chris explicitly noted this applies to 100% of customers using capacity with Netic — not just HB.

---

## Open Questions

- What format does the agency need? (CSV export, API feed, scheduled email, shared dashboard link?)
- Does the forward-looking view use scheduled appointments only, or factor in AI-predicted booking likelihood?
- Multi-tenant export in one view, or tenant-by-tenant?
- Should Tinuiti get direct access or does HB mediate?
- Frequency: do they need real-time or is a refresh every few hours sufficient?
- How far ahead does the ServiceTitan sync pull appointments? If only a few days, the 10-day forward view has a data gap.

---

## Build Complexity

The calculation engine already exists and is solid. The gap is that everything is computed real-time and nothing is stored — no historical record, no snapshots. The export and scheduling patterns also already exist in the codebase and are copy-paste friendly.

| Piece                                 | What it is                                                                                                                                           | Effort      |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Snapshot table + daily job + backfill | New DB table storing utilization per BU per day. Daily Inngest job runs the existing calc and saves results. One-time backfill job for history.      | Medium      |
| CSV export (on-demand download)       | New query against snapshot table, formatted as CSV. Plugs into the existing export reports page pattern.                                             | Easy        |
| Forward-looking 3/5/10 day view       | Extend the current 3-day board to longer windows. Aggregate average utilization over the requested range. Gated on how far ahead ServiceTitan syncs. | Medium      |
| Scheduled email delivery + config UI  | Most "net new" piece. Inngest cron job generates CSV and emails it. Config table for schedule + recipients. Settings UI.                             | Medium-Hard |

---

**Where you still need to think:**

- Exactly how utilization is calculated per BU (the formula has edge cases around non-job hours)
- Whether the forward-looking view should use raw scheduled appointments or something smarter
- Schema design for the snapshot and schedule config tables — worth thinking through before letting AI run
- The ServiceTitan sync coverage question — no amount of AI helps if the data isn't there

## build considerations:
- after hours is broken? double check this
- remove option to toggle today / tomorrow -- should be automatic based on after hours
- option on the top right to see 3 / 5 / 10 day window 
- export this to csv
- dont do grouping yet, start with this and use raw data
	- define grouping after
- concept of underoptimized: could be settings by business unit? 
	- should be able to have some settings for underoptimized (set target optimized thresholds)
	- could connect with ad stuff
- confirm where we get the data from:
	- we think its getting all job types per business unit, but a job type could be mapped to many business units