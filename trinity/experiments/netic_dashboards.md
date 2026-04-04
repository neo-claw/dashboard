### General
- All dashboards must support date range selection
#### (Revenue top level) High level view dashboard
- Closed won deals combined (sep. by OSP ISP)
#### (Revenue by branches) OSP Closed won deals, ISP closed won deals
- Breakdown by opportunity owner, value
- sep by OSP/ISP, group by owner, for some date range
- Filters: support different branches, select deal stage (opportunity stage)

#### Appt status
- By OSP owner, how many leads are and what stage their are in, # of appts by owner, broken down by stage
- End user goal: # of leads someone (owner) received and stage of that lead
#### Marketing Leads last month + this month
- broken out by channel (leads connected to some marketing channel)
- count of leads by owner bar chart
- marketing lead is a lead that was created as part of an interaction that is mapped to marketing (dialed phone number from marketing source, etc.)
- group by owner

### Jonathan's Dashboards
#### Revenue by Agent (ISP / OSP by Owner)
- revenue of closed won deals in a region by owner
	- revenue is monthly fees (annualized 12x) + initial fees
- Filters are lead pipelines (inside sales / outside sales) and date range

#### Wish list item: are agents selling more that 1 unit per sale?
- Dashboard to know how many bundles an agent sells per month
- Need clarification here @alan
#### Leads by Agent (ISP / OSP by Owner)
- date range
- Count of deals / leads that are at each stage PER owner

#### Inspection / Meeting Count by (Meeting Type or Owner)
- over some date
- All inspections, including HHS
- Find who is logging it and what inspection type was scheduled
	- REQUIRED FOR PAYOUTS
	- service type is really important
- email is unique identifier for user

#### Proposals -- Check in dashboard
- Can filter down to everyone, specific people, or teams
- Revenue based -- proposals by revenue dolars
	- at each deal stage
- Can define teams, define owners, etc.
- Should answer the question of oustanding revenue
- can be broken down by proposals today and proposals yesterday
	- hypothetical: how much revenue you have to close today
- pipeline can be ISP / OSP
- also can be MTD snapshot

#### Appointment status today and tomorrow
- Shows inspections / meetings scheduled for TODAY / TOMORROW by owner
- Tomorrow = leads with inspections scheduled for today / tomorrow / x days out
- Status of the lead / stage

#### Unscheduled LeadsAlso want to see how many leads an OSP has without an appointment scheduled
- new ^

#### Leads by OSP / Branch 30 days rolling
- group by branch, owner, opportunity stage, count of contacts*, sum of closed deal amount
- 
### Questions
- From loom: we count annualized revenue → what does this mean Alan Yu?
- What are bundles or units that the agent can sell? Jonathan was takling about this as a wish list item
- "all inspections including HHS" what does this mean @Alan?
- Are users who shedule inspections the same as owners?
- Where do we get marketing sources from?
- What are "contacts" in tech leads by osp/ branch rolling (img below)

## High-Level Core Dashboards

The dashboards above represent different filtered/grouped views of these core dashboard types. These are the actual dashboards to build:

### 1. Revenue Dashboard
**Purpose:** Show total revenue from closed won Opportunities

**Aggregates:**
- Sum of `Opportunity.value` (revenue = monthly fees × 12 + initial fees)
- Only for Opportunities in closed won `Opportunity_Stage`

**Dimensions (filters and groupings):**
- `Opportunity_Pipeline` (ISP / OSP)
- Branch (Pipeline/Branch in MECES)
- `sales_owner` (Owner)
- Date range (based on Opportunity close date)
- `Opportunity_Stage` (to filter for closed won)

**Specific views from above:**
- Revenue by Agent (ISP / OSP by Owner) — group by `sales_owner`, filter by pipeline
- OSP/ISP Closed won deals — filter by pipeline, group by `sales_owner`
- Revenue by branches — group by Branch

### 2. Opportunity Count Dashboard
**Purpose:** Show count of Opportunities at each stage

**Aggregates:**
- Count of Opportunities
- Grouped by `Opportunity_Stage`

**Dimensions (filters and groupings):**
- `Opportunity_Pipeline` (ISP / OSP)
- Branch
- `sales_owner` (Owner)
- Date range (based on Opportunity creation date or stage change date)
- `Opportunity_Stage`
- Has scheduled appointment (boolean filter)

**Specific views from above:**
- Leads by Agent — count by `sales_owner`, breakdown by stage
- Leads by OSP / Branch 30 days rolling — group by Branch, `sales_owner`, `Opportunity_Stage`
- Unscheduled Leads — filter where appointment not scheduled

### 3. Appointment/Meeting Dashboard
**Purpose:** Track scheduled appointments and inspections

**Aggregates:**
- Count of appointments/inspections
- Can be grouped by status, type, owner

**Dimensions (filters and groupings):**
- Meeting/Inspection type (appointment type)
- Service type (HHI, pest, sales, at-home, etc.)
- Scheduled by user (who logged it)
- Scheduled for `sales_owner` (OSP owner)
- Date range (appointment scheduled date)
- Scheduled date (today, tomorrow, X days out)
- Appointment status (scheduled, completed, voided, rescheduled)
- Related `Opportunity_Stage`
- Branch

**Specific views from above:**
- Inspection / Meeting Count — count by meeting type or owner
- Appointment status today and tomorrow — filter by scheduled date (today/tomorrow), group by owner
- Appt status — count by owner, breakdown by related `Opportunity_Stage`

**Notes:**
- Must link appointments to Opportunities (via `end_user` or direct foreign key)
- Must capture "scheduled by" agent (for payroll purposes)

### 4. Proposal Pipeline Dashboard
**Purpose:** Show outstanding revenue at each deal stage

**Aggregates:**
- Sum of `Opportunity.value` at each `Opportunity_Stage`
- Includes non-terminal stages (draft, sent, pending)
- Also show closed won for comparison

**Dimensions (filters and groupings):**
- `Opportunity_Pipeline` (ISP / OSP)
- `sales_owner` (Owner)
- Team (grouping of owners)
- Date range (proposal creation date)
- Time groupings: Today, Yesterday, MTD
- `Opportunity_Stage` (group by stage to show pipeline progression)

**Specific views from above:**
- Proposals -- Check in dashboard — revenue by stage, filterable by owner/team, time groupings

**Key Questions:**
- How much revenue did we propose yesterday?
- How much did we close yesterday?
- Where do we stand MTD for the pipeline?
- How much outstanding revenue is there?

### 5. Marketing Attribution Dashboard
**Purpose:** Track lead/opportunity creation by marketing source

**Aggregates:**
- Count of Opportunities created
- Count of `customer_interactions` (if mapped to marketing)
- Optionally: revenue from closed won Opportunities by source

**Dimensions (filters and groupings):**
- Marketing channel/source (from `customer_interactions` or Opportunity enrichment data)
- `sales_owner` (Owner)
- Date range (interaction date or Opportunity creation date)
- `Opportunity_Pipeline` (ISP / OSP)
- Branch

**Specific views from above:**
- Marketing Leads last month + this month — count by channel, group by owner
- "Hot opportunities per OSP" by marketing source — count of active Opportunities per owner by source

**Notes:**
- Marketing source can come from:
  - Phone number dialed (Invoca call data)
  - UTM parameters from web forms
  - 3rd-party aggregators (Yelp, etc.) mapped to branch

## Data Needs Summary

To build these dashboards, we need:

**From Opportunity:**
- `id`, `value`, `sales_owner`, `created_at`, close date, `Opportunity_Pipeline`, `Opportunity_Stage`, Branch

**From Appointments:**
- Appointment ID, scheduled date, scheduled by user, scheduled for owner (OSP), appointment type, service type, status, linked `end_user` or Opportunity

**From customer_interactions:**
- Interaction date, marketing source/channel, linked `end_user`, interaction type

**From Opportunity enrichment/custom fields:**
- Proposal creation date
- Proposal value (if different from `Opportunity.value`)
- Additional service type or bundle information

**Derived/Aggregated:**
- Count of Opportunities by stage
- Sum of revenue by various dimensions
- Has scheduled appointment flag per Opportunity
- Marketing attribution per Opportunity or interaction