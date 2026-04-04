- Make a new migration that removes the `pipeline_type` migration as this will be a custom field and not something we expect every opportunity pipeline to have. make sure we remove it everywhere.
We have duplicate views, one has _v and one doesnt have _v suffix:
- E.g. opportunity_latest_v vs. opportunity_latest
- Alan Yu which one to keep? Migrate off?
	- Outcome: Migration to drop old ones 
	- Merge any if needed
- Align gh_meeting.meeting_type vs gh_meeting.service_type:
	- Although davin seems to have said meeting_type was the above?
	- Thomaz Bonato make migration to add enum to gh_meeting columns
	- Sync with davin about the difference between these two
- Are we using Closed Won in backend implementation or Closed opportunity and status Won or Lost ?
We have both – Alan Yu to finish custom field integration
I see rn opportunity_stage has Closed Won so I want to align

- analytics should allow for custom fields to be groupable, with the "unknown" as null or not existing
- `pipeline-repository.ts` should handle ALL non biz logic
	- All db transactions 
	- double log should go here when we write to opportunity_log_event table
- separate analytics and prod tables is good

- explore invoca integration to pull marketing attribution for marketing attribution dashboard
