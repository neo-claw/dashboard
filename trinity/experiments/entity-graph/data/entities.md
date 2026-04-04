# Entity Explanation

## Existing Entities

**End_user**
- This will be the core identity model that will act as the through line for who a customer is
- It will be linked to all interactions and locations
- Independently, it will also have an address that can be primarily used for billing

**customer_interactions** (could be renamed)
- This represents any interaction the end_user has with Netic
- This can be phone calls, text messages, scheduler session, etc.

## New Entities

**end_user_contact_info**
- Represents a single contact method for an end user (e.g. email / phone number)
- This will map to end_user and a single end_user can have many end_user_contact_info

**end_user_location**
- This represents an address / service location
- E.g. it is a home with an address where we send a person for work
- This will map many to one with end_user

## New Lead Management Entities

**Opportunity**
- An opportunity for business / to sell something
- This will be the primary entity of the lead platform
- We are purposely not calling this a lead to avoid confusion with "leads" in the normal platform
- A lead is an interaction with an intent to book. It is a label for an interaction
- This can be related to customer_interactions, end_user, and end_user_locations
- Opportunities can be categorized with:
  - Pipeline / Branch (MECES)
  - Status (set by the customer)
  - Sales_Owner
- Notes:
  - Tags [] for additional categorization
  - We will have an enriched section for how to finish this

**Opportunity_Pipeline**
- This represents a sales pipeline
- An opportunity can only be in one sales pipeline at a time
- Important: this will house any logic related to transitioning between statuses

**Opportunity_Stage**
- This is the status of an opportunity
- Opportunities will have status and sales pipelines will manage opportunities with statuses
- Users should be able to manage status's

**Custom Fields**
- You can add custom fields to a stage / opportunity / pipeline

**Opportunity_Tags**
- A tag for tracking purposes
- This should also be it's own object with it's own value and id

**Enrichment_Data**
- These are additional data fields that can be referenced on a pipeline / lead

**Task**
- This represents a todo
- It can be attached to an opportunity to be done
