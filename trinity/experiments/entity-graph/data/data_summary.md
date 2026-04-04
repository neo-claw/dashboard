## Executive Summary
- **Total dashboards analyzed:** 5 (Revenue, Opportunity Count, Appointment/Meeting, Proposal Pipeline, Marketing Attribution)
- **General infrastructure gaps found:** 8 major gaps
- **Dashboard-specific gaps found:** 4 gaps
- **Current infrastructure readiness:** Medium - Core opportunity tracking exists, but critical analytics features are missing

## Discovery Summary (Phase 1 Findings)

### What Exists

**Core Database Schema:**
- `greenhouse.opportunity` - Versioned table tracking opportunities with fields: id, version, account_id, title, end_user_id, estimated_value, pipeline_id, stage_id, owner_id, custom_fields (JSONB), created_at, created_by
- `greenhouse.opportunity_pipeline` - Versioned pipeline definitions with: id, version, account_id, name, description, is_active, stage_ids (array), settings (JSONB), created_at, created_by
- `greenhouse.opportunity_stage` - Versioned stage definitions with: id, version, account_id, name, description, is_archived, stage_type (standard/intake), created_at, created_by
- `greenhouse.gh_owner` - Sales owners/CRM users with: id, account_id, user_id, first_name, last_name, role (sales_rep/sales_manager/admin), is_active, created_at, updated_at
- `greenhouse.gh_meeting` - Meeting/appointment tracking with: id, version, account_id, end_user_id, owner_id, opportunity_id (business ID), location_id, details (JSONB), created_at, created_by
- `greenhouse.opportunity_field_definition` - Custom field definitions per pipeline with: id, version, account_id, pipeline_id, field_key, field_label, field_type, validation_rules, options, help_text, is_archived
- `greenhouse.greenhouse_manual_interaction` - Manual interaction logging with: id, end_user_id, created_by_user_id, interaction_type (phone/email/text/user_note/in_person/other), note, created_at, updated_at

**Supporting Infrastructure:**
- `service_titan.job` - Job records with: id, tenant_id, service_titan_id, service_titan_tenant_id, data (JSONB), created_at, updated_at
- `service_titan.appointment` - Appointment records with: id, tenant_id, service_titan_id, service_titan_tenant_id, data (JSONB), created_at, updated_at
- `customer_interaction` - Customer interaction tracking with: id, session_id, call_id, thread_id, scheduler_session_id, created_at, updated_at, tenant_id
- `analytics.job_interaction_map` - Links ServiceTitan jobs to customer interactions
- `session` and `thread` - Both have `marketing_source` column for attribution tracking
- Latest views for all versioned greenhouse tables (opportunity_latest, opportunity_pipeline_latest, opportunity_stage_latest, gh_meeting_latest)

**Repository Classes:**
- `OpportunityRepository` - CRUD operations, list with filters (pipelineId, stageId, ownerId, endUserId), version history
- `PipelineRepository` - CRUD operations, list with filters (isActive), find pipelines containing stage
- `StageRepository` - CRUD operations, list with filters
- `InteractionRepository` - List interactions by end user (unions call, text, manual interactions), create manual interactions
- `ContactInfoRepository`, `LocationRepository`, `OpportunityFieldDefinitionRepository`

**Effect System:**
- Effect handler registry (`getEffectHandlersForAccount`) - Returns handlers for opportunity lifecycle events
- `LogStageChangeHandler` - Logs stage changes (active for all accounts)
- `TrackStageTimestampHandler` - Example handler (commented out) for tracking stage entry timestamps
- `NotifyOwnerHandler` - Example handler (commented out) for owner notifications

**Type Definitions:**
- Full TypeScript interfaces for all core entities with Zod schemas
- Custom fields support via JSONB
- Pipeline settings support stage-specific configuration (entry_requirements, field_display)
- Versioning pattern with optimistic locking

### What's Missing

**Critical Analytics Infrastructure:**
1. No stage change history table - Cannot track when opportunities moved through stages or calculate time in stage
2. No close date tracking - Opportunity table has `created_at` but no `closed_at`, `won_at`, or `lost_at` fields
3. No direct opportunity-to-appointment linkage - `gh_meeting.opportunity_id` stores business ID but no foreign key validation or join helpers
4. No Branch/Region data model - Pipelines, owners, and opportunities have no branch association
5. No ISP/OSP distinction - Pipeline table has no `pipeline_type` field or convention to distinguish ISP from OSP pipelines
6. No marketing attribution on opportunities - Opportunities not linked to customer_interaction or session/thread for source tracking
7. No "scheduled by" user tracking on meetings - `gh_meeting` has owner_id and created_by but no explicit "scheduled_by_payroll_user_id" for payroll reporting
8. No aggregation/materialized views - No pre-computed analytics tables for dashboard performance

### Architecture Notes
- Versioning pattern is robust for audit trail but creates complexity for reporting (must join to _latest views)
- Custom fields in JSONB provide flexibility but make querying harder for analytics
- Account-based multi-tenancy (account_id) with separate tenant references in ServiceTitan tables
- Effect system exists but is minimal (only logging active, no timestamp tracking or history building)
- ServiceTitan integration uses JSONB data blobs, not flattened columns, requiring JSON path queries

## General Infrastructure Gaps
*General infrastructure gaps are compiled from things that we need to build that is used by more than 1 dashboard.*

#### 1\. Stage Change History Tracking

**What's Missing:** No table to track when opportunities move between stages with timestamps

**Needed By:** 

* Revenue Dashboard (close date)  
* Opportunity Count Dashboard (stage change date)  
* Proposal Pipeline Dashboard (time groupings)

**Current State:** OpportunityRepository tracks version history, but not stage-specific transitions. TrackStageTimestampHandler example exists but is commented out and only logs, doesn't persist.

**What Needs to Be Built:**

- Create `greenhouse.opportunity_stage_transition` table with columns:  
  - `id` (UUID), `opportunity_id` (business ID), `account_id`  
  - `from_stage_id` (nullable for first entry, denormalized for query convenience)  
  - `to_stage_id` (the stage they're IN during this period)  
  - `entered_at` (timestamp when entered stage)  
  - `exited_at` (timestamp when left stage, NULL \= currently in this stage)  
  - `duration_seconds` (generated column: `exited_at - entered_at`)  
  - `changed_by` (user\_id), `created_at`  
- Add indexes: `(opportunity_id, entered_at DESC)`, `(account_id, to_stage_id, entered_at)`, `(account_id, entered_at)`  
- Implement effect handler to:  
  - UPDATE previous record (set `exited_at = NOW()`)  
  - INSERT new record with `entered_at = NOW()`, `exited_at = NULL`  
  - Skip intermediate states if multiple rapid changes occur  
- Backfill from version history using LAG/LEAD window functions to reconstruct stage periods from `opportunity_version_history` table

\#\#\#\#\#\#\# [Thomaz Bonato](mailto:thomaz@netic.ai)  
**Could also have status changing, value sets**

- **Blob it all together in stage transition**  
- `GH.opportunity.opportunity_change` metadata blob  
- There will likely be more events we want to track  
  - Not one table per event  
  - Be a little more generic about it  
- [Thomaz Bonato](mailto:thomaz@netic.ai) think about generalizable vs. this  
- Stages can be changed however you want, dont necessarily flow linearly  
  - `Closed` is a stage here

\#\#\#\#\#\#\#

**Impact:** Enables date-range filtering by close date, stage duration calculations, and time-in-stage analytics

**Complexity:** Medium \- Requires new table, effect handler implementation, and backfill strategy

#### 2\. Close Date Fields on Opportunity

**What's Missing:** No explicit `closed_at`, `won_at`, or `lost_at` timestamp fields on opportunity table

**Needed By:** Revenue Dashboard (filter by close date), Proposal Pipeline Dashboard (yesterday/MTD comparisons)

**Current State:** Only `created_at` exists. Stage changes tracked in version history but not easily queryable for "when did this close?"

**What Needs to Be Built:**

- Add `closed_at TIMESTAMPTZ` column to `greenhouse.opportunity` table  
- Add `close_status ENUM('won', 'lost', NULL)` to distinguish won vs lost  
- Update OpportunityManagerService to populate these fields when moving to terminal stage (check stage\_type or pipeline settings)  
- Update effect system to detect terminal stage transitions and set close fields  
- Add indexes on (account\_id, closed\_at) and (account\_id, close\_status, closed\_at)

\#\#\#\#\#  Comments from conversation[Thomaz Bonato](mailto:thomaz@netic.ai)

- Add status to the opportunity table for closed  
- Close is a stage  
  - Close stage has restriction on status  
- Pending / voided / Won / lost is a status  
- Voided opportunity \= not meant to count it, usually made by mistake

\#\#\#\#\#

**Impact:** Direct date filtering for revenue dashboards without complex stage history joins

**Complexity:** Quick win \- Single migration, simple effect handler logic

### 3\. Branch/Region Data Model

**What's Missing:** No branch or region association for pipelines, owners, or opportunities

**Needed By:** All dashboards \- Every dashboard requires "Branch" as a dimension

**Current State:** Account-level scoping exists, but no sub-account branch structure. Some tenants may map to branches 1:1, but no explicit modeling.

**What Needs to Be Built:**

- Create `greenhouse.branch` table with columns: id, account\_id, name, description, is\_active, created\_at, updated\_at  
- Add `branch_id UUID REFERENCES greenhouse.branch(id)` to:  
  - `greenhouse.opportunity_pipeline` (pipeline belongs to branch)  
  - `greenhouse.gh_owner` (owner assigned to branch)  
  - Optionally `greenhouse.opportunity` for override (defaults to pipeline.branch\_id)  
- Add indexes on branch\_id foreign keys  
- Populate branch data from existing tenant/account mapping or manual configuration  
- Update repositories to include branch in filters

\#\#\#\# Comments

- Opportunity has end customer and location → location has zipcode  
- Custom value (optional fields) in opportunity\_pipeline that has branch  
  - opportunity.custom\_values.branch  
- Owners have notion of branch zipcode table looks up  
  - Every opportunity must have an owner  
  - Not all opportunities will have branches though → hence custom fields

\#\#\#\# 

**Impact:** Enables all branch-level reporting and filtering across dashboards

**Complexity:** Medium \- Requires new table, multiple schema changes, data migration strategy, and potential multi-branch support per entity

### 4\. ISP/OSP Pipeline Type Distinction

**What's Missing:** No field to distinguish ISP (Inside Sales Pipeline) from OSP (Outside Sales Pipeline)

**Needed By:** Revenue Dashboard, Opportunity Count Dashboard, Proposal Pipeline Dashboard, Marketing Attribution Dashboard (all filter/group by ISP/OSP)

**Current State:** Pipeline names may contain "ISP" or "OSP" but no structured field for filtering

**What Needs to Be Built:**

- Add `pipeline_type VARCHAR(50)` column to `greenhouse.opportunity_pipeline` table  
- Create enum or check constraint for values: 'ISP', 'OSP', 'OTHER'  
- Backfill existing pipelines based on name pattern matching or manual classification  
- Update OpportunityFilters and PipelineFilters to support pipeline\_type filtering  
- Update UI and API to expose pipeline\_type for dashboard filtering

**Impact:** Clean ISP/OSP segmentation in all dashboards without name parsing

\#\#\#\# Comments

- Aligned

\#\#\#\# 

**Complexity:** Quick win \- Single column addition, enum constraint, backfill script

### 5\. Marketing Attribution on Opportunities

**What's Missing:** Opportunities not linked to customer\_interaction or session/thread for marketing source tracking

**Needed By:** Marketing Attribution Dashboard (all metrics)

**Current State:**

- `customer_interaction` table exists with links to session/call/thread  
- `session` and `thread` have `marketing_source` column  
- Opportunities link to `end_user_id` but not to specific interaction that created them  
- No tracking of which phone number, UTM parameter, or campaign led to opportunity creation

**What Needs to Be Built:**

- **Add `source_interaction_id UUID REFERENCES customer_interaction(id)` to `greenhouse.opportunity` table**  
- Add `marketing_source TEXT` to `greenhouse.opportunity` table (denormalized from interaction for performance)  
- Update opportunity creation flows to capture source:  
  - When opportunity created from inbound call/text: set source\_interaction\_id  
  - When opportunity created from web form: extract UTM parameters and set marketing\_source  
  - When opportunity created manually: optionally link to recent interaction  
- Create view `greenhouse.opportunity_attribution_v` that joins opportunities to full interaction details (session, call, marketing\_campaign, etc.)  
- Add indexes on (account\_id, marketing\_source) and source\_interaction\_id

**Impact:** Full marketing attribution reporting by channel, campaign, phone number, UTM source

\#\#\#\# Comments

- Two parts:  
  - Get marketing attribution on the lead → invoca pulls marketing attribution from phone call  
    - Keyed on phone number?  
    - Interaction will have the attribution, opportunity will have it from the interaction  
  - Marketing source on the opportunity  
  - Think about populating this  
- We do have API access to Invoca  
  - [https://published.usemotion.com/docs/doc\_vM8CJRPfn6U2vnNfpx1EcS/certusxnetic\_phase\_1\_12\_16\_netic\_first\_ish\_zoom\_cc\_launch\_requirements](https://published.usemotion.com/docs/doc_vM8CJRPfn6U2vnNfpx1EcS/certusxnetic_phase_1_12_16_netic_first_ish_zoom_cc_launch_requirements) 

\#\#\#\# 

**Complexity:** Medium \- Schema changes straightforward, but requires integration points in opportunity creation flows (API, UI, import jobs)

### 6\. "Scheduled By" User Tracking on Meetings

**What's Missing:** No explicit "scheduled by" user field distinct from owner and creator

**Needed By:** Appointment/Meeting Dashboard (scheduled by user dimension for payroll)

**Current State:**

- `gh_meeting.created_by` exists (user who created the record)  
- `gh_meeting.owner_id` exists (OSP owner assigned to meeting)  
- No separate "scheduler" role (e.g., ISP agent who scheduled for OSP agent)

**What Needs to Be Built:**

- Add `scheduled_by_user_id UUID REFERENCES "user"(id)` to `greenhouse.gh_meeting` table  
- Distinguish from `created_by` semantics:  
  - `created_by`: system user who created the record (could be API, import, etc.)  
  - `scheduled_by_user_id`: actual human agent who scheduled the appointment (for payroll credit)  
- Update meeting creation API to require scheduled\_by\_user\_id  
- Backfill existing records: scheduled\_by\_user\_id \= created\_by where created\_by IS NOT NULL  
- Add index on scheduled\_by\_user\_id

**Impact:** Accurate payroll reporting for appointment scheduling activity

\#\#\#\# Comments

- Aligned

\#\#\#\# 

**Complexity:** Quick win \- Single column addition, API update, simple backfill

### 7\. Analytics Aggregation Tables or Materialized Views

**What's Missing:** No pre-computed aggregation tables for dashboard queries

**Needed By:** All dashboards \- Performance optimization for large datasets

**Current State:** All queries would scan greenhouse.opportunity\_latest, join to pipelines/stages/owners, and aggregate on-the-fly

**What Needs to Be Built:**

- Option A: Materialized views refreshed periodically  
  - `greenhouse.opportunity_daily_summary_mv`: Pre-aggregate counts and revenue by date, pipeline, stage, owner, branch  
  - Refresh via cron job or trigger on opportunity changes  
- Option B: Real-time aggregation table maintained by triggers  
  - `greenhouse.opportunity_metrics`: Incremental updates on INSERT/UPDATE/DELETE  
  - Columns: metric\_date, account\_id, pipeline\_id, stage\_id, owner\_id, branch\_id, opportunity\_count, total\_value, closed\_won\_count, closed\_won\_value  
- Option C: Hybrid \- Daily batch \+ real-time adjustments  
  - Nightly batch builds daily rollups  
  - Intraday queries add "today's" live data to yesterday's cached data

**Impact:** Dashboard query performance 10-100x improvement, especially for historical date ranges

**Complexity:** Complex \- Requires careful design for correctness, incremental updates, and handling versioned data

## Dashboard-Specific Gaps

### Revenue Dashboard

#### 1\. Closed Won Stage Identification

**What's Missing:** No standard way to identify "closed won" stages across pipelines

**Current State:** Stages have names (e.g., "Closed Won", "Won", "Deal Closed") but no `is_closed_won` boolean or stage classification field

**What Needs to Be Built:**

- Add `stage_classification VARCHAR(50)` to `greenhouse.opportunity_stage` table  
- Values: 'open', 'closed\_won', 'closed\_lost', 'archived'  
- Or use existing `is_archived` \+ new `is_closed_won BOOLEAN` and `is_closed_lost BOOLEAN` fields  
- Update stage creation/editing UI to classify stages  
- Backfill existing stages based on name matching heuristics  
- Revenue dashboard filters for `stage_classification = 'closed_won'`

**Complexity:** Quick win \- Single field addition, enum/boolean, backfill script

\#\#\#\# Comments

- Solved by stage closed, status \= won / los

\#\#\#\# 

### Opportunity Count Dashboard

#### 1\. "Has Scheduled Appointment" Derived Field

**What's Missing:** No efficient way to filter opportunities by "has scheduled appointment" without complex subquery

**Current State:** Would require LEFT JOIN to gh\_meeting and check for NULL, or subquery EXISTS check

**What Needs to Be Built:**

- Option A: Add `has_scheduled_appointment BOOLEAN` column to `greenhouse.opportunity` table  
  - Maintained by trigger or effect handler when gh\_meeting created/deleted  
  - Indexed for fast filtering  
- Option B: Create indexed view `greenhouse.opportunities_with_appointments_v`  
  - SELECT DISTINCT opportunity\_id FROM gh\_meeting WHERE opportunity\_id IS NOT NULL  
  - Use IN subquery with index hint  
- Option C: Use aggregation table (from Gap \#8) with appointment count metric

**Complexity:** Medium \- Trigger-based approach requires careful handling of meeting lifecycle; view approach simpler but potentially slower

\#\#\#\# Comments

- Just join on the meeting table  
- Build meeting table early next week, poc [Davin Jeong](mailto:davin@netic.ai)

\#\#\#\# 

### Appointment/Meeting Dashboard

#### 1\. Meeting Type and Service Type Fields

**What's Missing:** `gh_meeting.details` is JSONB blob \- no structured fields for meeting type, service type, status

**Current State:** Meeting metadata stored in flexible JSONB, but not queryable for dashboard grouping without JSON path expressions

**What Needs to Be Built:**

- Add structured columns to `greenhouse.gh_meeting`:  
  - `meeting_type VARCHAR(100)` (e.g., "Inspection", "Sales Meeting", "Follow-up")  
  - `service_type VARCHAR(100)` (e.g., "HHI", "Pest", "HVAC", "At-home")  
  - `appointment_status VARCHAR(50)` (e.g., "scheduled", "completed", "voided", "rescheduled", "no\_show")  
  - `scheduled_date TIMESTAMPTZ` (when appointment scheduled for, distinct from created\_at)  
- Migrate existing data from details JSONB to structured columns  
- Add indexes on (account\_id, appointment\_status), (account\_id, scheduled\_date)  
- Update meeting creation/editing to use structured fields

**Impact:** Direct grouping and filtering in SQL without JSONB queries

\#\#\#\# Comments

- Meeting are just appointments from the scheduler   
- Booked in OSP scheduler → book → creates a meeting → meeting linked to an opportunity  
  - 1 opportunity to many meetings is fine  
  - Link meetings to opportunities manual rn is fine

\#\#\#\# 

**Complexity:** Medium \- Schema change, data migration, API updates

### Proposal Pipeline Dashboard

#### 1\. Proposal-Specific Timestamps

**What's Missing:** No "proposal created date" or "proposal sent date" distinct from opportunity created\_at

**Current State:** Opportunity created\_at may be when lead entered system, not when proposal drafted or sent

**What Needs to Be Built:**

- Add to `greenhouse.opportunity` or use custom\_fields:  
  - `proposal_drafted_at TIMESTAMPTZ`  
  - `proposal_sent_at TIMESTAMPTZ`  
- Update effect handlers or stage transitions to populate these timestamps:  
  - When opportunity moves to "Proposal Draft" stage → set proposal\_drafted\_at  
  - When opportunity moves to "Proposal Sent" stage → set proposal\_sent\_at  
- Add indexes on proposal timestamps  
- Pipeline dashboard uses proposal\_sent\_at for "yesterday" / "MTD" time groupings

**Impact:** Accurate proposal age tracking and time-based filtering (proposals sent yesterday, this week, etc.)  
\#\#\#\# Comments

- Don’t think about this yet  
- 1:1 with opportunity  
- Hold off for now

\#\#\#\# 

**Complexity:** Quick win \- Column additions, effect handler logic, indexes

## Dependencies & Build Order Notes

**Critical Path:**

1. **Branch data model** (Gap \#3) \- Foundational for all dashboards, blocks most reporting features  
2. **ISP/OSP distinction** (Gap \#4) \- Required for accurate pipeline segmentation, quick win  
3. **Stage change history** (Gap \#1) \+ **Close date fields** (Gap \#2) \- Enables time-based reporting, should be built together  
4. **Marketing attribution** (Gap \#6) \- Independent of other gaps, can be built in parallel  
5. **Appointment linkage** (Gap \#5) \+ **Meeting type fields** (Dashboard \#3.1) \- Build together for appointment dashboard  
6. **Scheduled by tracking** (Gap \#7) \- Quick add-on to appointment linkage work  
7. **Closed won classification** (Dashboard \#1.1) \- Depends on stage history for backfill  
8. **Proposal timestamps** (Dashboard \#4.1) \- Depends on stage history for automation  
9. **Aggregation tables** (Gap \#8) \- Build last after all data sources stabilized

Timeline by next week some time:

* Focus on having the infra  
* Build out hex on top of it for meetings next week  
* Sync tmr and the next day 15 min quickly
---

## Summary

The Greenhouse system has a solid foundation with versioned entities, flexible custom fields, and basic relationship tracking. However, **analytics capabilities are minimal**. To support the 5 dashboards, the highest priority gaps are:

1. **Branch/Region data model** - Blocks all dashboard filtering
2. **Stage history + close date tracking** - Enables time-based revenue and pipeline analytics
3. **ISP/OSP distinction** - Required for pipeline segmentation
4. **Marketing attribution** - Core requirement for attribution dashboard
5. **Appointment linkage + structured meeting fields** - Enables appointment dashboard

The recommended build order prioritizes foundational dimensions (Branch, ISP/OSP) first, then time-tracking infrastructure (stage history, close dates), followed by specialized features (appointments, marketing), and finally performance optimizations (aggregation tables).

---

## Eng Team Discussion: What Changed & What's Still Open

### What Changed (Decisions Made)

**Gap #1 – Stage Change History:**
- Don't build a narrow `stage_transition` table. Instead, use a generic `GH.opportunity.opportunity_change` metadata blob that can capture any kind of change (stage, status, value, etc.)
- Not one table per event — design should be generalizable
- Stages don't flow linearly; `Closed` is itself a stage

**Gap #2 – Close Date / Close Status:**
- `Closed` is a stage, not a separate field
- Status lives on the opportunity `Opportunity.status`: `Pending / Voided / Won / Lost`
- Voided = created by mistake, should not count in analytics
- `Closed` stage has a restriction on which statuses are valid

**Gap #3 – Branch/Region:**
- No separate `branch` table — branch will live in custom fields on `opportunity_pipeline` (`opportunity.custom_values.branch`)
- Owners have branch association via zipcode lookup (which can be overridden manually)
- Not all opportunities will have a branch (hence optional/custom field approach)
- Every opportunity must have an owner

**Gap #4 – ISP/OSP Distinction:**
- Aligned, proceed as originally planned

**Gap #5 – Marketing Attribution:**
- Confirmed we have API access to Invoca
- Flow: Invoca pulls attribution from phone call → attribution lives on the interaction → opportunity inherits it from the interaction
	- **Will worry about this later**

**Gap #6 – "Scheduled By" on Meetings:**
- Aligned, proceed as originally planned

**Revenue Dashboard – Closed Won Identification:**
- Solved by the stage + status approach (stage = Closed, status = Won/Lost) — no separate `is_closed_won` field needed

**Opportunity Count Dashboard – Has Scheduled Appointment:**
- Simplify: just join on the meeting table, no derived boolean column needed
- Davin to build the meeting table early next week

**Appointment/Meeting Dashboard – Meeting Type Fields:**
- Meetings are appointments booked through the OSP scheduler
- One opportunity can have many meetings — that's fine
- Manual linking of meetings to opportunities is acceptable for now

**Proposal Pipeline Dashboard – Proposal Timestamps:**
- Hold off entirely for now, 1:1 with opportunity
- Not a priority — skip for current build

---

### What's Still Open / Needs More Thought

- **Generic change event design (Gap #1):** Need to finalize what goes into the `opportunity_change` blob — what fields, what events trigger it, and how generalizable the schema should be. Thomaz to think through generalizable vs. specific tradeoffs.
- **Branch zipcode lookup (Gap #3):** Exact mechanism for resolving branch from owner zipcode is undefined. Also need to clarify behavior for opportunities with no branch.
- **Marketing attribution population (Gap #5):** How exactly does `marketing_source` get written onto the opportunity? Is it keyed on phone number from Invoca? The integration point and population logic needs to be thought through.
	- wont worry about this for now
- **Aggregation / materialized views (Gap #7):** No decision made yet — deferred until other data sources are stable.
	- yuh
