# Utilization Export v1 — Design & Tradeoffs

## What We're Building

Three things bundled as v1:
1. Extend the utilization board from fixed 3 days to a 3/5/10 day toggle
2. Fix after-hours detection — remove the manual "view today" toggle, make it automatic
3. Add a CSV export button that downloads what you see (respects current BU selection + day window)

Pilot: HB Nashville. The use case is Hoffmann's marketing team and their ad agency (Tinuiti) adjusting paid ad budgets based on capacity — e.g. if capacity is >115% booked, reduce ad spend to 70%.

---

## Design Summary

No new database tables. Everything is computed on-demand using the existing calculation engine (`getCapacityForWindow`), which already handles any date window and any set of business units.

**Flow:**
```
User selects 5D + 3 BUs → clicks Export CSV
  → POST /api/dashboard/capacity/utilization-export
  → Body: { days: 5, buIds: [123, 456, 789] }
  → getUtilizationBoardData runs engine per BU in batches of 5
  → CSV built row-by-row, returned as { csvContent: string }
  → Browser downloads utilization-2026-02-25.csv
```

**CSV columns:** Date, Business Unit, % Booked, Jobs Booked, Shift Hours, Job Hours

**% Booked formula:** `jobHours / (shiftHours - nonJobHours)` — job hours as a % of available capacity after stripping non-job time (meetings, training, etc.)

---

## Key Considerations

**After hours behaviour**
The board currently shows a manual toggle to include/exclude today when after hours. The engineer confirmed this is broken/confusing. v1 makes it fully automatic: after hours = always start from tomorrow, no override. One fewer state variable, simpler mental model.

**Null % booked (no shifts)**
If a business unit has no shifts on a day, `percentBooked` is null. The CSV renders this as an empty cell — not 0 — so the ad agency doesn't misread "no data" as "completely empty calendar."

**Job type / BU attribution**
The engineer flagged that a job type can technically be mapped to multiple business units. The current engine attributes jobs to BUs via `j.business_unit_id` for unassigned (tray) jobs and via the technician's home BU for assigned jobs. This needs a sanity check before merging — not a design problem but a data accuracy question.

**10-day window on large tenants**
The engine runs per BU in batches of 5, so a tenant with 50 BUs × 10 days is ~100 DB query rounds. Fine for HB Nashville as the pilot. Worth monitoring before rolling out to tenants with large BU counts.

---

## Tradeoffs

**On-demand calculation vs. snapshot table**

We chose on-demand (no new DB tables) for v1. The alternative — storing daily utilization snapshots via an Inngest job — would be faster for large windows and would enable historical data, but adds significant complexity (migration, daily job, backfill, monitoring). For a pilot with one tenant, on-demand is the right call. Snapshot table is the obvious next step if we need historical exports or performance becomes an issue.

**POST body vs. GET query params for export**

Passing `buIds` as query params would hit URL length limits with many business units. POST body has no length constraint and matches how the existing export-reports routes work.

**`{ csvContent: string }` vs. streaming response**

Returning CSV as a JSON string field is simple and consistent with existing exports. Max ~50KB for 10 days × 50 BUs — no meaningful overhead. Streaming/pre-signed S3 URLs are overkill here; they'd matter for exports with thousands of rows and large text fields.

**Single-tenant scope**

v1 exports one tenant at a time (current user's tenant). Hoffmann has multiple tenants (HB Nashville, HB St. Louis, etc.) and will eventually want a cross-tenant view for their agency. Deferred — the auth model and current UI are per-tenant; cross-tenant is a separate feature.

---

## Deferred for Later

- Scheduled email delivery to Tinuiti (Phase 2)
- Per-BU underoptimized threshold settings (currently hardcoded: 100/66/33 for days 0/1/2)
- Historical utilization view (requires snapshot table)
- Cross-tenant export

---

## Files Changed

| File | What |
| --- | --- |
| `dashboard/features/capacity/lib/utilization-board.ts` | Add `days` + `buIds` params |
| `app/api/dashboard/capacity/utilization-board/route.ts` | Forward `days` query param |
| `app/api/dashboard/capacity/utilization-export/route.ts` | New POST export route |
| `lib/reports/get-utilization-csv.ts` | New CSV builder function |
| `dashboard/features/capacity/hooks/use-utilization-board-query.ts` | Accept `days` param |
| `dashboard/features/capacity/components/three-day-board/ThreeDayBoard.tsx` | Day toggle + after hours fix + export button |
