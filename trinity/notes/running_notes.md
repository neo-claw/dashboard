## Mar 31, 2026

* Finish up the docs   
  * Made PR [13848](https://github.com/cybernetic-ai/blackbird/pull/13848)  
  * Engineering Wiki [here](https://docs.google.com/document/d/1HJ59EbrrEfHeB6RKeXtozq2cc8AxAPIp0kR-zH5sa-E/edit?tab=t.0)  
  * `lib/analytics/REFRESH_FLATTENED_INTERACTION.md` cool thing cursor could prob do\!  
* Thread backfill  
  * Made ticket [here](https://linear.app/netic/issue/ANA-213/revisit-thread-backfill-exposure)  
* Reach out to steph  
  * **Will drop it off IRL next week\!**  
* Finish up Salesforce tests and send results to Andrew / Teddy  
  * Sending to andrew / teddy shortly after this

## Mar 30, 2026

* Ideas for AI assisted dev \+ Openclaw ordeals this weekend  
  * IMO spending \~10% of time to enable ai to develop better could be worth  
  * Using step3.5 flash free for my personal openclaw and it is ripppingggg  
    * Integrated with skills like Playwright for frontend view, compound-engineering for planning steps, and its own DB query service  
* Leaving behind docs for all the above topics  
  * Call recordings  
    * GCS set up for recordings  
  * Multi FSM classifiers  
    * Explain ClassifierOptions and how we switch in pest classifiers  
  * Post transfer workflows  
  * Greenhouse analytics  
  * Zookeeper stuff?  
  * QA dash prioritization docs  
  * Refresh query  
  * Utilization – @teddy  
  * \++ ask chat with this doc  
  * **Formatting**  
    * This is what built / how it works  
    * Design decisions  
    * Known issues  
    * Future considering  
  * In engineering wiki, leave behind “Thomaz Docs” with paths for stuff  
* Salesforce help with more won? [Albert Yue](mailto:albert@netic.ai) to check in with Teddy and Andrew  
  * Lmk here  
  * Lead (80%)→ —- (x%) → service appointment (20%)  
  * .8%  
* Check with Steph about mailing or dropping off laptop in person  
  * Offboarding procedure?

## Mar 27, 2026

* Campaign analytics:  
  * Talk with andrew and teddy about this:  
    * Service\_appointment.parent\_record\_id  
    * 0.6% (504 / 83k)  
    * This is the key needed to connect service appointments to work orders, and it is almost always missing. The current sync also skips it, so this join path mostly does not work today.  
  * How do they define who can be an audience member? How do we ingest them to run a campaign  
  * Get context on campaign setup \+ connection to lead for Eagle  
* For docs  
  * Google doc in Empower, separate tab or separate doc in analytics folder  
  * \+ codebase

## Mar 26, 2026

* Inbound text stuff  
  * Ran backfill on inbound text for Energy Aid  
    * We were filtering on `service-titan` booking provider before :(  
    * Fix that in PR [13506](https://github.com/cybernetic-ai/blackbird/pull/13506/changes)  
    * Run backfill once pr 13506 is in **DONE**  
  * UI stuff is ready  
    * PR [13508](https://github.com/cybernetic-ai/blackbird/pull/13508)  
    * Worked for energy aid along with backfill PR  
* Made a new skill that is helping with pushing inbound text analytics  
  * DB-query skill PR [13502](https://github.com/cybernetic-ai/blackbird/pull/13502)

## Mar 25, 2026

* Flattened out Salesforce columns with PR [13368](https://github.com/cybernetic-ai/blackbird/pull/13368), [13369](https://github.com/cybernetic-ai/blackbird/pull/13369)   
* Won count is **still** really low for Energy Aid  
  * Likely due to a linking problem  
  * In salesforce: Bookings happen as ServiceAppointments on Accounts. The only bridge is Lead.Account\_\_c → SA.AccountId, but **only 20% of leads have Account\_\_c populated**.  
    * Result: someone gets our text, then books by phone, we usually can't connect the two  
* Made a new skill that is helping with pushing inbound text analytics  
  * DB-query skill PR [13502](https://github.com/cybernetic-ai/blackbird/pull/13502)

## Mar 24, 2026

* Scope of energy aid campaign analytics  
  * We dont have analytics rows for all the audience members part of Energy Aid  
  * See below

```
Why many wins don’t have linked analytics rows
public.analytics is not written when someone is marked won. It’s written by analytics ingestion jobs (e.g. Roadrunner session processing in app/api/inngest/analytics/roadrunner.ts), which copy session.audience_member_id onto the row:

They often lack rows or audience_member_id because analytics is session-driven and copy-on-write from session, not won-driven; upsert doesn’t update audience_member_id; and older or alternate sessions may never have had the id set. Fixing it means tightening session creation, backfilling from campaign_outbound, and ideally updating the analytics upsert so linkage stays correct over time. Your LEFT JOIN change makes the funnel honest when analytics is missing; backfill + upsert fix makes revenue / booked / triggers line up with those members where you care about dollars and classification
```

* After mocking the backfill \+ upsert fix, it fixed the showing of booked, but showed significant undercounting and a lack of revenue  
  * Investigating

![][image1]

* See above^ we dont have any data for jobs booked / anything won since   
* See below:

```
So for Energy Aid, campaign "won" numbers are likely significantly undercounted because they only capture bookings that happen inline through the campaign text thread, missing any out-of-band conversions. If a customer texts back "I'd like to schedule" and then books through a phone call or separate flow, that never becomes a "won".
```

* Even after mocking the bookings from other modalities in a relevant time period, the won numbers are still really low. They roughly doubled but still not much  
* Can’t estimate numbers if we used `service_appointment` table to define “WON”  
  * What needs flattening:  
    * salesforce.work\_order — add account\_id TEXT (from data-\>\>'AccountId')  
    * salesforce.lead — add account\_c TEXT and converted\_account\_id TEXT (from data-\>\>'Account\_\_c' and data-\>\>'ConvertedAccountId')  
  * PR [13368](https://github.com/cybernetic-ai/blackbird/pull/13368), [13369](https://github.com/cybernetic-ai/blackbird/pull/13369)

```
Why these three columns fix it:

The join becomes wo.account_id = sl.account_c OR wo.account_id = sl.converted_account_id on indexed text columns. Postgres can hash join on plain text columns. The OR still needs two passes but each one is indexed.

The migration would:

ALTER TABLE salesforce.work_order ADD COLUMN account_id TEXT
ALTER TABLE salesforce.lead ADD COLUMN account_c TEXT, ADD COLUMN converted_account_id TEXT
Backfill from JSONB: UPDATE ... SET account_id = data->>'AccountId' (same pattern as the existing 1770757488000 SA flattening migration)
Create indexes: CREATE INDEX ON salesforce.work_order (account_id, org_id) and CREATE INDEX ON salesforce.lead (account_c), CREATE INDEX ON salesforce.lead (converted_account_id)
Update the SF sync code to populate these columns on insert/update going forward
Also need to update the sync code — wherever salesforce.work_order and salesforce.lead rows are inserted/updated, the new columns need to be set. This is the same pattern the SA flattening followe
```

* TLDR:  
  * Need to write into analytics for Salesforce campaigns  
  * Flatten out salesforce info (PR [13368](https://github.com/cybernetic-ai/blackbird/pull/13368), [13369](https://github.com/cybernetic-ai/blackbird/pull/13369))  
  * Use service appointments booked between times of the campaigns to get more “won”   
  * Confirm with andrew on limited offer campaigns booking rate  
  * After the above: Precompute joins / speed up the queries  
* **Do we have revenue numbers for salesforce / energy aid specifically?**  
  * Andrew said we might need to estimate revenue for Salesforce  
  * Check with Andrew / Teddy

## Mar 23, 2026

* Catch up on Invoca, analytics stuff, etc.  
* Write up docs mentioned above  
* Get feedback on refresh flattened interaction app that replaces refresh function  
  * Current function looks  
* Send doc markdown   
* Energy aid wants analytics for text  
  * Inbound text  
    * **Inbound:** look at what we need to backfill then populate frontend  
      * Backfill \+ turning on frontend?  
      * Audit text? Not sure if this will be necessary, take a look  
      * If needed involve DC / QA  
  * Campaigns – win condition doesn’t work bc diff FSM  
    * **Make it work for salesforce structure**  
    * Understand their specifics  
    * Don’t book jobs but book a service appointment  
  * Start the thinking on what a generalized campaign win structure should look like  
    * Current bad things: dont track why it was won (metadata) – ie was it a response, was it an appointment, or something else entirely   
    * Top level tables should be generalizable  
    * Some common interface is helpful  
  * **\#1 get it working for energy aid, then \#2 generalizable**   
    * Look at [https://energyaid.netic.ai/dashboard/analytics/campaigns](https://energyaid.netic.ai/dashboard/analytics/campaigns)   
    * Maybe add the same coalesce we have for calls  
    * Maintain a running doc of decisions / outstanding items \+ supporting infra (like the general job table, etc.)  
    * **Take a look at the q2 plan**  
  * **AIM for Friday? ASAPPPP**

## Mar 13, 2026

* Invoca  
  * Check if bug fix pushed yesterday fixed it  
  * PR sending customer\_interaction id and lead\_data into the opportunity  
    * Throw in channel and mention its the last thing to unblock  
    * PR [12619](https://github.com/cybernetic-ai/blackbird/pull/12619)  
    * **Merged**  
  * Updating the backfill script but doesnt write to opportunity  
    * Fuzzy match  
    * **TBD [Thomaz Bonato](mailto:thomaz@netic.ai)**  
* Post transfer  
  * Monitoring  
  * Andrew EnergyAid live transfers – writing to the right tables?  
  * Looks good, its populating in [https://energyaid.netic.ai/dashboard/analytics/inbound?interactions-reason-drilldown-sankey=true](https://energyaid.netic.ai/dashboard/analytics/inbound?interactions-reason-drilldown-sankey=true)   
* Refresh function  
  * ~~Merge PR [Thomaz Bonato](mailto:thomaz@netic.ai)~~  
    * ~~Apply to dev and stg~~  
    * **Done**  
  * **Investigate timing out workflow ([here](https://cloud.temporal.io/namespaces/main-netic-prod.atr3u/workflows/sync-analytics-materialized-view-schedule-workflow-2026-03-13T19%3A49%3A00Z/019ce8be-bcac-7ce9-bb59-3e9c6cfe10d7/timeline))**  
  * Tradeoffs on new system vs. current system  
    * **Have doc for this by EOD got cooked**  
      * How current `refresh_flattened_interaction` works  
      * Known potential issues (timing out every \~10-15 runs)  
      * What the new refresh system will tangibly look like  
      * Tradeoffs between the two  
    * Plan: take on new system implementation once [Thomaz Bonato](mailto:thomaz@netic.ai) comes back Mar 21, 2026UNLESS big issues arise

## Mar 12, 2026

* Check up on Invoca stuff  
  * Found bug: [12668](https://github.com/cybernetic-ai/blackbird/pull/12668)  
  * Another bug (postCallAction doesn’t fire a result): PR IN PROGRESS [Thomaz Bonato](mailto:thomaz@netic.ai)  
* Get the other Invoca PR in (pipes `customer_interaction_id` \+ `lead_data` into opportunity)  
  *  PR [12619](https://github.com/cybernetic-ai/blackbird/pull/12619)  
    * **Bugbot fixes**  
  * Bookmarking attribution on end users  
    * Track for end\_user where they came from  
    * Historical or most recent  
    * **Think on this a little bit**  
  * **DEF EOD**  
* Analytics post transfer use pest: PR [12626](https://github.com/cybernetic-ai/blackbird/pull/12626)  
* Refactor analytics post transfer entirely PR [12682](https://github.com/cybernetic-ai/blackbird/pull/12682)  
  * **~~TO BE TESTED:~~**  
  * **Tested and deploying to prod**  
  * start with `interactions_reason` as the main table to start the SQL query from instead of `analytics` table  
    * Have it possible to enable post transfer break down (4th-level nodes)  
    * Will prob put behind a feature flag?  
    * Rn all ST tenants should have it as long as data exists  
    * **Carefully make sure it doesnt mess up existing tenant data**  
  * Going to work through this today as **main focus** so we can enable it for Energy Aid, Lookout, Certus, etc.  
  * **HOPEFULLY EOD, def EOW**  
* THEN new refresh function  
  * **P0.5**  
  * **Depends on the above**  
    * Concrete plan before I leave

## Mar 11, 2026

* Get the Invoca PRs in  
  * Before running backfill make sure \# of calls tracks and data actually makes sense  
  * Monitor to make sure they are working – no time out  
* Start working on the new refresh functionality that tracks relevant tables  
  * Good idea by eod tn  
  * In by friday/saturday

## Mar 10, 2026

* INVOCAAAA  
  * Some erroring: [https://cloud.temporal.io/namespaces/main-netic-prod.atr3u/workflows/process-call-ended-call\_152aaa79ec3880a0ab94040a219/019cd986-de27-7593-a15e-3a34a969e48b/timeline](https://cloud.temporal.io/namespaces/main-netic-prod.atr3u/workflows/process-call-ended-call_152aaa79ec3880a0ab94040a219/019cd986-de27-7593-a15e-3a34a969e48b/timeline)  
* Backfill script: [https://github.com/cybernetic-ai/blackbird/pull/12546](https://github.com/cybernetic-ai/blackbird/pull/12546)  
* Forward fill on `postCallAction`: [https://github.com/cybernetic-ai/blackbird/pull/12547](https://github.com/cybernetic-ai/blackbird/pull/12547)

## Mar 9, 2026

* **Check workflows with refresh flattened interaction to make sure they are alive**  
* GCS tenant-based auth for call download  
  * \+ backfill  
  * **Conductor ripping this rn**  
* From ZK stuff quality of life improvements to-do:  
  * Combine ZK `RecordingPlayer` with the dashboard one soon  
  * Clean up `zookeeper/lib/diarization.ts` and `lib/external/deepgram/utils.ts`  
  * **Check if call with internal\_csr\_diarization\_url has timestamps** [Thomaz Bonato](mailto:thomaz@netic.ai)  
* Supporting Greenhouse analytics stuff as needed  
  * **RIGHT AFTER THIS:** Run e2e test for alan and report back  
* Design docs pending:  
  * **MAIN FOCUS THIS WEEK:** Solution for analytics refresh not using CDC \+ data warehouse  
    * From talk with zi & shail the main issue is we start with a wide filter (select \* from customer\_interaction where …) then reduce down using filters  
    * We want bottom up approach instead  
    * Proposal: new app code that writes to `interactions_to_refresh` given relevant tables and columns such that splitting out scans to populate this with temporal jobs isolate the issues  
      * Table: `interactions_to_refresh` with   
        * id, uuid  
        * interaction\_id, fk interaciton  
        * due\_to\_col\_update  
        * from\_table  
        * refresh\_status \= (`pending`, `in_progress`, `completed`, `failed`)  
    * Difficulty: need well defined (table, column) pairs we care to track on update  
      * Off top of my head: service\_titan.job syncs, inbound phone call, message, etc. etc.  
    * **Questions:** should this system handle populations or only refreshes? How do we handle deletes? Some sort of on cascade? Add fk to relevant columns in flattened interaction so we always have link to ground truth and just use on cascade delete?  
  * Backburner – Think about marketing attribution in general  
    * Delair: marketing is looking back in time, previous calls and look for attribution  
    * Willing to overwrite it to look for the initial touchpoint  
    * Looking within the month to see if a previous call has attribution  
    * Marketing attribution timeline?   
      * **Delair eventually wants this but not urgent**

## Mar 6, 2026

* **Hit cloud agent limit can we get this unblocked? @teddy**  
* Think about marketing attribution in general  
  * Delair: marketing is looking back in time, previous calls and look for attribution  
  * Willing to overwrite it to look for the initial touchpoint  
  * Looking within the month to see if a previous call has attribution  
  * Marketing attribution timeline?   
    * **Delair eventually wants this but not urgent**  
* From ZK stuff:  
  * Combine ZK `RecordingPlayer` with the dashboard one soon  
  * Clean up `zookeeper/lib/diarization.ts` and `lib/external/deepgram/utils.ts`  
  * **Check if call with internal\_csr\_diarization\_url has timestamps** [Thomaz Bonato](mailto:thomaz@netic.ai)  
* Other ZK stuff:  
  * Rip human\_picked\_up\_at (event logging) for internal\_csr\_transfer  
  * **Migrations PR [12211](https://github.com/cybernetic-ai/blackbird/pull/12211)**  
  * **Code PR [12212](https://github.com/cybernetic-ai/blackbird/pull/12211)**  
* Invoca  
  * PR [12215](https://github.com/cybernetic-ai/blackbird/pull/12215)  
* Twilio backfill  
  * **Rip cursor**   
* GCS tenant-based auth for call download  
  * \+ backfill  
  * **Rip cursor/claude??**  
* Solution for analytics refresh not using CDC \+ data warehouse **by EOWKND**  
  * From talk with zi & shail the main issue is we start with a wide filter (select \* from customer\_interaction where …) then reduce down using filters  
  * We want bottom up approach instead  
  * Proposal: new app code that writes to `interactions_to_refresh` given relevant tables and columns such that splitting out scans to populate this with temporal jobs isolate the issues  
    * Table: `interactions_to_refresh` with   
      * id, uuid  
      * interaction\_id, fk interaciton  
      * due\_to\_col\_update  
      * from\_table  
      * refresh\_status \= (`pending`, `in_progress`, `completed`, `failed`)  
  * Difficulty: need well defined (table, column) pairs we care to track on update  
    * Off top of my head: service\_titan.job syncs, inbound phone call, message, etc. etc.  
  * **Questions:** should this system handle populations or only refreshes? How do we handle deletes? Some sort of on cascade? Add fk to relevant columns in flattened interaction so we always have link to ground truth and just use on cascade delete?

## Mar 5, 2026

* Utilization changes **by EOD**  
  * 1\) Do not export the percentage in a whole number. It should be .73 not 73\.  
  * 2\) I want prior day(s) included. Include as many prior days as there are forward-looking days.  
    * **Make sure its clear what day’s perspective we are using for export csv**  
  * 3\) Need to have a scheduled delivery of this report. Ideally, every day at the same time.  
  * **Done** **w/ Teddy**  
* Test UI bug fixes: [12118](https://github.com/cybernetic-ai/blackbird/pull/12118), [12117](https://github.com/cybernetic-ai/blackbird/pull/12117)  
  * **Send to albert after**  
* Invoca integration for greenhouse **by EOD**  
  * Use API or webhook or both  
  * Marketing attribution   
  * [Davin Jeong](mailto:davin@netic.ai) [Alan Yu](mailto:alan@netic.ai)  
* Twilio backfill  
  * **Rip cursor**   
* GCS tenant-based auth for call download  
  * \+ backfill  
  * **Rip cursor/claude??**  
* Solution for analytics refresh not using CDC \+ data warehouse **by EOWKND**  
  * From talk with zi & shail the main issue is we start with a wide filter (select \* from customer\_interaction where …) then reduce down using filters  
  * We want bottom up approach instead  
  * Proposal: new app code that writes to `interactions_to_refresh` given relevant tables and columns such that splitting out scans to populate this with temporal jobs isolate the issues  
    * Table: `interactions_to_refresh` with   
      * id, uuid  
      * interaction\_id, fk interaciton  
      * due\_to\_col\_update  
      * from\_table  
      * refresh\_status \= (`pending`, `in_progress`, `completed`, `failed`)  
  * Difficulty: need well defined (table, column) pairs we care to track on update  
    * Off top of my head: service\_titan.job syncs, inbound phone call, message, etc. etc.  
  * **Questions:** should this system handle populations or only refreshes? How do we handle deletes? Some sort of on cascade? Add fk to relevant columns in flattened interaction so we always have link to ground truth and just use on cascade delete?

## Mar 4, 2026

*  Post transfer UI changes**DONE**  
* UI Bugs: [12118](https://github.com/cybernetic-ai/blackbird/pull/12118), [12117](https://github.com/cybernetic-ai/blackbird/pull/12117)  
* UI BUG:  
  * ![][image2]  
  * Z-index is to far in front for inbound analytics  
* UI BUG: timestamps for transferred calls seem incorrect:  
  	![][image3] vs.  
* ![][image4]  
* Same call same timestamps even tho internal csr was 2:25 long  
* ZK transcripts timestamps [11807](https://github.com/cybernetic-ai/blackbird/pull/11807)  
* ZK human picked up at [11908](https://github.com/cybernetic-ai/blackbird/pull/11908)  
* Invoca integration for greenhouse:  
  * Only forward fill with `app/api/public/inbound/invoca/certus/route.ts`?   
  * Save to session.marketing\_source or session.marketing\_data?  
  * When an opportunity is created from a setting, it should pull from that session source and blob storage   
    * Live on the session  
  * how to link invoca call to opportunity itself?  
  * How do we pull call data from invoca?  
  * Backfill?  
  * We have log in in 1 password  
  * Does the original call only link to one opportunity or all? How do you define this?

## Mar 3, 2026

* Studying for midterm so i dont fail

## Mar 2, 2026

* **Heads up, will need some time tmr to grind for a midterm wednesday at school since i havent been to class in like 2 wks lol**  
* Completed over wknd:  
  * Hoffmann utilization for stl and nash v1  
    * [View here](https://hoffmann.netic.ai/dashboard/utilization/board)  
  * Greenhouse analytics v1 scaffolding in Hex  
    * [View Hex source here](https://app.hex.tech/01996332-2250-7005-90f8-76364d1454fd/hex/Greenhouse-Analytics-032YMaUw2kHA7swyHYqA3r/draft/logic?view=app) and [here](https://app.hex.tech/01996332-2250-7005-90f8-76364d1454fd/app/032YMaUw2kHA7swyHYqA3r/latest)  
* Ongoing:  
  * Commit scripts for call recording recovery after fixing build on it  
  * Redo grouping for hoffmann utilization for stl and nash  
    * PR [11907](https://github.com/cybernetic-ai/blackbird/pull/11907)  
  * Look at Caccia  
    *   
  * **Booking rate modified for netic agent**  
  * Build out Invoca marketing integration for marketing attribution **EOW**  
    *   
  * Twilio transfer recording classification backfill  
    * Some werent initiated  
    * Honestly we should have a catchall temporal function  
  * Post transfer recording UI changes for Certus **EOW**  
    * Debug the auth issue of loading in call recording  
    * [Albert Yue](mailto:albert@netic.ai) to take this  
  * Refresh function fix or BigQuery?  
    * [Shail Patel](mailto:shail@netic.ai) to take this?  
    * Talk more with Zi  
* ZK  
  * Timestamps on all the transcripts → timestamp of the call recording  
    * Pre-transfer, internal and post transfer  
    * **In progress**  
  * “Human picked up at” for post transfer  
    * **Have cursor cloud agent rip this**  
    * Ripping  
  * Add some way to search multiple users through list  
    * **Have cursor cloud agent rip this**  
* Backfills:  
  * Spliced the call recordings from `internal_csr` \+ `transfer` calls (\~100)  
    * Define how, ring central logs?  
    * Maybe Telnyx logs? → telnyxCallControlId, pull through axiom  
      * Figuring out what calls actually got affected since we overwrite `Status = Transfer` here  
      * All of this may need to use RingCentral logging, initially RingCentral did the transferring

## Feb 27, 2026

* Done:  
  * GH analytics migrations and wiring for v1  
  * Backfilled internal\_csr\_transcript for those with existing recording url  
  * Run recovery script to pull recording url and also write internal\_csr\_transcript  
    * **All but 13 calls were able to be backfilled – those not able to be backfilled did not begin recording for some reason**  
* Ongoing:  
  * **Commit scripts for call recording recovery**  
    * Backfill transfer\_recording\_url with no existing diarization and stuff  
  * **GH analytics v1 – rip this**  
    * Need the wiring pr in [11743](https://github.com/cybernetic-ai/blackbird/pull/11743) :/  
    * Hex dash  
      * [Thomaz Bonato](mailto:thomaz@netic.ai) start doing hex dash  
    * Invoca marketing attribution  
  * Utilization export CSV to ad integration with Teddy  
    * Meeting with Hoffmann at 12pm  
    * Rip this  
  * Post transfer workflow for twilio recording  
    * Integrate it into transcription \+ classification pipeline (`transfer-call-ended`)  
      * **Have claude code rip this**  
  * Spliced the call recordings from `internal_csr` \+ `transfer` calls (\~100)  
    * Define how, ring central logs?  
    * Maybe Telnyx logs? → telnyxCallControlId, pull through axiom  
      * Figuring out what calls actually got affected since we overwrite `Status = Transfer` here  
      * All of this may need to use RingCentral logging, initially RingCentral did the transferring  
  * Post transfer recording UI changes for Certus **EOW next week**  
    * Debug the auth issue of loading in call recording  
* Zookeeper work for DC if time:  
  * Make all recordings downloadable  
    * PR [11811](https://github.com/cybernetic-ai/blackbird/pull/11811)  
  * Timestamps on all the transcripts → timestamp of the call recording  
    * Pre-transfer, internal and post transfer  
    * **Have claude code rip this**  
  * Add some way to search multiple users through list  
    * **Have claude code rip this**  
  * “Human picked up at” for post transfer  
    * **Have claude code rip this**

## Feb 26, 2026

* Done:  
  * Did not reach human reasons are pushed in \+ backfilled  
  * Twilio recordings are up for transfers  
* Ongoing:  
  * Melisa special project – utilization export for ad spend  
  * Greenhouse analytics v1 sprint  
  * **Figure out how to link up lost recordings from Telnyx**  
    * Won’t show up in any of the columns  
    * Call start / stop events were still happening, saved webhook not sent  
    * Recovery – here  
  * **Backfilling transcripts for internal CSR transcripts**  
    * internal\_csr\_recording\_url, internal\_csr\_transcript  
    * Temporal workflow that kicks off after call recording saved events in Telnyx whenever we get an internal\_csr recording → run this on historical recordings  
  * **Post transfer workflow for twilio recording**  
    * Recovery here  
* Backburner:  
  * BigQuery \+ CDC change, write back into a new Postgres instance  
  * Next week

## Feb 25, 2026

* In the office\!  
* Bug: `Did Not Reach Human` doesn't have the Opted for Callback / Hit Voicemail / Hung up reasons don't show up  
  * **New migration required \- got lost in translation**  
  * PR [11640](https://github.com/cybernetic-ai/blackbird/pull/11640)  
  * **OUTSTANDING:** since refresh\_flattened\_interaction doesn't do a full refresh every time, we will need to run a backfill which I will run after this is merged  
    * [Thomaz Bonato](mailto:thomaz@netic.ai)  
* Potential bug:  
  * *definition of `transfer_recording_started_at` has change now that internal CXRs can be inserted in the middle. Can we double check if that has possible impact on recordings?*  
  * *As one sanity check, I don't see any recent axiom logs on Recording timestamps do not match. AI delta: so maybe this is addressed?*  
  * **Unnecessary for twilio recording**  
* Chat about data warehousing for analytics  
  * CDC from postgres to BigQuery and then use BQ from there  
  * Move over end point queries, power dash from BQ  
  * BigQuery can trigger from there  
  * First step can push back into it  
  * **Sync up with Alan, Albert, Shail for this as well set for 6:30 pm**  
    * Read up on how this usually works  
  * Chat notes in slack GC  
* Get twilio recording in  
  * Sync with Zi about PR [11576](https://github.com/cybernetic-ai/blackbird/pull/11576)  
  * Made changes so `internal_csr` is supported as well in the upload  
* GH analytics v1 in hex dash by EOD  
  * SPRINT  
  * Build out triggers in Typescript  
  * Test it out  
  * Hex dash with basic sql to test

## Feb 24, 2026

* Call recording twilio focus  
  * PR [11576](https://github.com/cybernetic-ai/blackbird/pull/11576)  
* Call recording:  
  * Support twilio since we will probably be switching over to them  
  * Researching rn  
  * For [Davin Jeong](mailto:davin@netic.ai)we need to be able to support the following cases  
    * Only Netic call recording  
    * Netic \+ human transfer call recording  
    * Only human pick up call recording  
      * Pass through our phone number (auto-transfer)  
      * Create IPC?  
    * **Needs above by March 1st**  
  * **Twilio call recording for tonight EOD**  
    * **WIP**, have it ready for testing just need to set up my twilio test number  
* GH analytics  
  * Typescript handling to push updates to opportunity, etc. tables on changing  
    * **WIP**  
  * Aggregated views for hex dash  
    * For now just do sql on top of regular tables  
  * Push out Hex dash  
* Call card v2 for Certus by March 1st  
  * No waveform  
  * Based on Osmond’s design here: [https://www.figma.com/design/zzaY0mf4viqNWUYVqSBqqs/%F0%9F%93%A5-Convert--Hub?node-id=3454-16897\&m=dev](https://www.figma.com/design/zzaY0mf4viqNWUYVqSBqqs/%F0%9F%93%A5-Convert--Hub?node-id=3454-16897&m=dev)  
    * Albert to takeover [Albert Yue](mailto:albert@netic.ai)  
    * My branch: `thobonato/convert-hub-ui`

## Feb 20, 2026

* Greenhouse  
  * [https://github.com/cybernetic-ai/blackbird/pull/11218](https://github.com/cybernetic-ai/blackbird/pull/11218) ✅  
    * Went in looks good  
  * [https://github.com/cybernetic-ai/blackbird/pull/11219](https://github.com/cybernetic-ai/blackbird/pull/11219) \[closed\]  
    * Talked with davin, we will use Opportunity as append-only instead  
  * Typescript handling PR  
  * Aggregated views for hex dash  
  * Push out hex dash

## Feb 19, 2026

* Callcard v2 for Certus by March 1st  
  * No waveform  
  * CRM only tenants – no netic agent, transfer right away, have recording but no netic leg  
  * Telnyx calling restructure March 1st (generalize   
* Analytics issues with populating tables :( down   
* Update our definitions for customer facing analytics for [Aniket Kamthe](mailto:aniket@netic.ai) **by EOD tn**  
  * [https://docs.google.com/spreadsheets/d/1iGpdL-2ZTd-UioGTVlnlJyUeZzEVxXrsUmhiok17gvg/edit?gid=384460501\#gid=384460501](https://docs.google.com/spreadsheets/d/1iGpdL-2ZTd-UioGTVlnlJyUeZzEVxXrsUmhiok17gvg/edit?gid=384460501#gid=384460501)

## Feb 18, 2026

* GH analytics stuff  
  * Get migrations in → add enum from service\_type, and other enums from davin  
  * Start working on the typescript changes with updated PR stuff  
* Voicemail  
  * [Thomaz Bonato](mailto:thomaz@netic.ai) PR [11140](https://github.com/cybernetic-ai/blackbird/pull/11140) **Run on off peak time** (failing due to lock timeout)  
* **Ongoing:**  
  * Post transfer recording / transcript based on Osmond’s [Figma Design](https://www.figma.com/design/zzaY0mf4viqNWUYVqSBqqs/%F0%9F%93%A5-Convert--Hub?node-id=1765-23564&p=f&m=dev)  
  * Multi FSM analytics for other modalities – text, campaigns

## Feb 17, 2026

* Added logging to the refresh functions so we can see what goes wrong  
* Voicemail, hung up, and opted for callback  
  * PR [11140](https://github.com/cybernetic-ai/blackbird/pull/11140) [Albert Yue](mailto:albert@netic.ai) 😀another not so great looking migration  
  * [Thomaz Bonato](mailto:thomaz@netic.ai) **Run on off peak time** (failing due to lock timeout)  
* GH analytics stuuuuffff  
* **Ongoing:**  
  * Post transfer recording / transcript based on Osmond’s [Figma Design](https://www.figma.com/design/zzaY0mf4viqNWUYVqSBqqs/%F0%9F%93%A5-Convert--Hub?node-id=1765-23564&p=f&m=dev)  
  * Multi FSM analytics for other modalities – text, campaigns

## Feb 16, 2026

* Over the weekend implemented migration to `flattened_interaction`  
  * Significantly reduced time outs, see images  
  * Before (6am \- 11am **Last thursday**Feb 12, 2026\)  
    ![][image5]  
  * After (6am \- 11am **Today \- monday** Feb 16, 2026), still a little time out but much better  
    ![][image6]  
  * **Look into time outs to see if its easy to fix**  
* Main focus will be GH analytics  
  * [Alan Yu](mailto:alan@netic.ai) to relay back what dashboards Tim wants  
  * Build out db schema \+ handlers for the data  
  * Hex dash to map out data  
* Decision to add did not reach human reason/subreason  
  * ![][image7]  
  * Voicemail, hung up, and opted for callback  
  * PR [11140](https://github.com/cybernetic-ai/blackbird/pull/11140)  
  * Run by Osmond  
* Post transfer recording / transcript   
  * [https://www.figma.com/design/zzaY0mf4viqNWUYVqSBqqs/%F0%9F%93%A5-Convert--Hub?node-id=1765-23564\&p=f\&m=dev](https://www.figma.com/design/zzaY0mf4viqNWUYVqSBqqs/%F0%9F%93%A5-Convert--Hub?node-id=1765-23564&p=f&m=dev)  
* Multi FSM analytics for other modalities – text, campaigns

## Feb 14, 2026 \- Feb 15, 2026

* Deep dive into mat view issues with   
  * The Problem:  
    * analytics.classification table is 25 GB with 95.8 MILLION rows  
  * What's happening:  
    * Every 7 minutes, REFRESH MATERIALIZED VIEW CONCURRENTLY scans 95.8M classification rows and 19.9M task rows  
    * But only 67 classifications and 14 tasks changed in the last 7 minutes (0.00007% of data\!)  
    * Query 3 (test query) shows: 19,973,102 shared buffer hits \= \~156 GB of memory reads for just the task CTE  
  * Solution:  
    * **Option 2: Increase Timeout \+ Remove CONCURRENTLY**  
      * Remove CONCURRENTLY (2-3x speedup)  
      * Increase timeout from 3 min → 10 min (safety net)  
    *   Why both:  
      * Even with 2-3x speedup, as data grows you might hit 3 minagain  
      * 10 min timeout gives headroom for growth  
      * Still meets \<10 min staleness requirement  
    * **Option 3: Partition the Materialized View**  
      * Only do this if Options 1+2 still timeout  
      * Partition analytics.flattened\_interaction by created\_at (monthly or weekly)  
      * Only refresh recent partition(s)  
      * Old partitions never change, so don't refresh them  
    * Trade-off:  
      * ✅ Scales forever (refresh time doesn't grow with history)  
      * ⚠️ More complex (partitioning setup, partition management)  
      * ⚠️ Wait to see if needed (Options 1+2 should fix it)  
  * **The query is fundamentally expensive:**  
1. Window function on 95M rows (class\_ranked CTE with row\_number() OVER (...))  
2. DISTINCT ON 19M rows (latest\_task CTE)  
3. Multiple joins on millions of rows  
4. UNION ALL combining call and text branches  
   * With your data:  
     * Task table scan: \~18 seconds  
       * Classification window function: Probably 60-120 seconds (95M rows\!)  
       * Joins \+ aggregations: \~30-60 seconds  
       * Total: 2-4 minutes just to build the view

## Feb 13, 2026

* Verbal call back transfer for all tenants  
  * PR [11014](https://github.com/cybernetic-ai/blackbird/pull/11014)  
  * Testing\!\!  
    * Weird cases where its not as explicit of a callback confirmation  
    * **Set recording\_offset\_ms to end of recording for callback confirmation**  
  * [Albert Yue](mailto:albert@netic.ai) Does Del-air want this to show up as a new flag or not flag at all?  
    * Not flag at all for now  
    * PR [11014](https://github.com/cybernetic-ai/blackbird/pull/11014)  
* See dashboards \+ necessary data for GH analytics in [\[WIP\] Lead Management Center - Greenhouse](https://docs.google.com/document/d/1c52IwELk0t3A9EdwDi_0Sh1yEHc-bM4K8rOoaxsJocI/edit?tab=t.8al0kmgjxoq0) under `Analytics tab`  
  * All dashboards are based on the [Loom](https://www.loom.com/share/b1182410777144ebbfb841ef3f89580f)  
  * Reduced down into 5 main dashboards, 3 are priority  
  * [Alan Yu](mailto:alan@netic.ai) to confirm with Tim (EXT) if these are good  
* Todo:  
  * Fix mat view issues asapppp  
    * It happened again this morning  
    * **Google query insights to find what part is the slowest**  
      * **Primary db?**

**![][image8]**

* Define GH data needs  
  * 1\) data we already have and dont need to touch  
    * 2\) data have but need to make changes to  
    * 3\) data we need to add  
  * Build out db \+ handlers for the data  
  * Hex dash to map out data

## Feb 12, 2026

* Had a midterm at 8am this morning so last night was not as productive, will make up for it  
* Todo general:  
  * Verbal “call back” override for `transfer_not_pick_up` flag  
    * Del air: transfer → would like to request for callback → yes / no / hang up  
      * Store their decision somewhere about the callback  
      * [Albert Yue](mailto:albert@netic.ai) to check if no \= callback or if they can keep waiting, etc.   
    * Should we just not do a flag or have it flag a diff way?  
    * Cases where someone doesn’t opt for a callback and didn’t get transferred live  
    * Del-air wants this fast  
    * For general sense, if IVR confirms they are getting a call back, then write that for all  
    * **Get this done by EOD** [Thomaz Bonato](mailto:thomaz@netic.ai)  
  * Fix our mat view issues  
    * Look at postgres level lock time out possibility  
    * **EOD**  
* Todo green house:  
  * Map out dashboard they care about from [loom](https://www.loom.com/share/b1182410777144ebbfb841ef3f89580f)  
  * Start ripping  
  * TAB: Analytics \- Thomaz in [\[WIP\] Lead Management Center - Greenhouse](https://docs.google.com/document/d/1c52IwELk0t3A9EdwDi_0Sh1yEHc-bM4K8rOoaxsJocI/edit?tab=t.8al0kmgjxoq0)   
* Eventually: multi fsm analytics for other modalities – text, campaigns

From watching video:

* Support date range  
* **(Revenue top level) High level view dashboard**  
  * Closed won deals combined (sep. by OSP ISP)  
* **(Revenue by branches, sep by OSP/ISP, group by owner, for some date range) OSP Closed won deals, ISP closed won deals**  
  * Breakdown by opportunity owner, value  
  * Filters: support different branches, select deal stage  
  * **From loom: *we count annualized revenue* → what does this mean [Alan Yu](mailto:alan@netic.ai)?**  
* **Appt status**

## Feb 11, 2026

* Alerting update: PR [10896](https://github.com/cybernetic-ai/blackbird/pull/10896)  
* Interactions\_reason override \+ move codified logic to sql from post transfer remapping   
  * PR [10899](https://github.com/cybernetic-ai/blackbird/pull/10899) and PR [10903](https://github.com/cybernetic-ai/blackbird/pull/10903)  
  * 10903 is the one that moves code logic to sql but it lowk sucks  
    * **10903 is not the best way to do this, its getting hectic**  
    * **10899 is necessary, 10903 is replacing code logic**  
* **CHECK BACKFILL**  
  * **Go through a few to make sure things look right**  
  * Need override to have customer\_identifier bc it may not exist in flattened\_interaction PR:  
* Multi-FSM analytics beyond just calls  
  * Do text \+ campaigns to energy aid  
    * Lookout, Certus, Tragar **might** be on text  
    * Shouldn’t be any different, look at high level numbers before pushing in fully–roughly what we expect  
    * Post on channel, no need for deep dive since they should be similar enough  
    * Campaigns make sure numbers all work good

**Greenhouse-related:**

* Read through greenhouse code and PRs from alan  
  * Need event\_based tracking, where we will fire all these events  
  * Everything is moved by salespeople  
* Pull all green house migrations  
* Start thinking about general schema  
  * [\[WIP\] Lead Management Center - Greenhouse](https://docs.google.com/document/d/1c52IwELk0t3A9EdwDi_0Sh1yEHc-bM4K8rOoaxsJocI/edit?tab=t.0)  
* Events that actually matter:  
  * Opportunity stage changed (**already have**)  
  * Opportunity created  
  * Opportunity won/lost/voided (derive from stage change)  
  * Owner changed  
  * Value changed  
  * Custom fields changed  
  * Appointment lifecycle (created, voided, rescheduled)  
* Effect handler is more business / code logic  
  * Analytics should not live here, effect handlers can be turned off / on  
  * On opportunity edit / create / update it should run an update  
  * Fire an event if certain things change   
  * `opportunity_change_events` that can capture all events then aggregate later  
  * Look at dashboards we need to build then what type of events we need to have for them  
  * What events need to be known even if they change over time  
    * Revenue per stage per pipeline is easy  
    * Jobs booked should probably be events we should log  
    * **Everything is a log\!**  
  * Find metrics based on dashboard view then plan for every dashboard  
    * [Alan Yu](mailto:alan@cyberneticlabs.ai) will send looms of 3 dashboards  
* General questions to answer:  
  * How are we getting ISP vs OSP? By `pipeline_id`?

## Feb 10, 2026

**General:**

* Add the two things from Temporal schedule alerting to the removed list  
  * [Thomaz Bonato](mailto:thomaz@netic.ai)  
* **Make sure that the transferred calls not getting picked up are actually being flagged**  
  * All good here  
* Backfill on interactions reason override from thread:  
  * Call out: \~8% of the threads with “thread\_” in their thread id have no classifications and can’t get backfilled. ⅓ of these come from classic aire care  
    * Look into why here, doesn’t have to be solution  
  * Backfill is in, just need to audit it (live under source \= `thread_backfill`)  
    * Timespan: 2024-05-22 → 2025-05-23  
  * Top 3 tenants affected in general:  
    * c935c774-2e7b-4f94-a31f-36c806641c52	28507  
    * ba5d86e3-f538-4e00-83c4-33408378a9b2	22629  
    * ade4879e-63c6-4d81-9ac0-0932f1951712	10827  
  * **Make sure these top 3 tenants were correctly backfilled**  
  * **Need new PR to build up interactions\_reason using override** [Thomaz Bonato](mailto:thomaz@netic.ai)  
    * Send to analytics channel once this is in  
    * PR [10899](https://github.com/cybernetic-ai/blackbird/pull/10899)  
* **Finish up remap interaction in SQL**  
  * Building diff for PR rn [Thomaz Bonato](mailto:thomaz@netic.ai)  
  * [10903](https://github.com/cybernetic-ai/blackbird/pull/10903)  
* **Post transfer rec/transcript on hub will not happen soon, Osmond and I sync’d and he believes its too large of a change**  
  * Make linear ticket and add branch  
  * **Done**  
* Ongoing before greenhouse:  
  * Multi-FSM analytics beyond just calls  
    * Do text \+ campaigns to energy aid  
      * Lookout, Certus, Tragar **might** be on text  
      * Shouldn’t be any different, look at high level numbers before pushing in fully–roughly what we expect  
      * Post on channel, no need for deep dive since they should be similar enough  
      * Campaigns make sure numbers all work good  
  * Deprio: case statement system? [Albert Yue](mailto:albert@netic.ai)  
    * It was a pain to do the remapping from code to sql tho ngl

**Greenhouse-related:**

* Read through greenhouse code and PRs from alan  
  * Need event\_based tracking, where we will fire all these events  
  * Rough schema  
  * Everything is moved by salespeople  
  * Event triggers are always completely separate from AI agent  
* Pull all green house migrations  
* Start thinking about general schema  
  * [\[WIP\] Lead Management Center - Greenhouse](https://docs.google.com/document/d/1c52IwELk0t3A9EdwDi_0Sh1yEHc-bM4K8rOoaxsJocI/edit?tab=t.0)

## Feb 9, 2026

* Pending schedule alerting PR need review pls: [10738](https://github.com/cybernetic-ai/blackbird/pull/10738)  
  * Convert to \[alert\] not high  
  * Allow for blocking or some list to not check  
  * PR: [10834](https://github.com/cybernetic-ai/blackbird/pull/10834)  
* For today:  
  * Finish up feature auto-flagging transferred calls not picked up [NET-5733](https://linear.app/netic/issue/NET-5733/flag-user-when-transferred-call-isnt-picked-up)  
    * **Tested\!** [10815](https://github.com/cybernetic-ai/blackbird/pull/10815)  
  * **Osmond giving designs for post transfer recording \+ transcript** by eod, will get that ready  
    * Designs: [https://www.figma.com/design/zzaY0mf4viqNWUYVqSBqqs/%F0%9F%93%A5-Convert--Hub?node-id=1765-23564\&p=f\&m=dev](https://www.figma.com/design/zzaY0mf4viqNWUYVqSBqqs/%F0%9F%93%A5-Convert--Hub?node-id=1765-23564&p=f&m=dev)   
    * **Osmond made designs but decided the change requires larger frontend work. This will be deprioritized. Saved changes to by branch** `thobonato/hub/post-transfer`  
  * Moving threads to override interactions → backfill `public.analytics`  
    * Sanity check dashboard to **make sure they show up properly**  
    * Dash should look alright :)   
    *   
  * Finish up move remapInteraction from lib/inbound/query to interactions\_reason mat view  
    * Need to make sure this applies correctly to both getBreakdownData \+ getIneractionsReasonBreakdownData  
* If time:  
  * Get started on multi-fsm analytics beyond just calls  
  * Do text \+ campaigns to energy aid  
    * Lookout, Certus, Tragar **might** be on text  
    * Shouldn’t be any different, look at high level numbers before pushing in fully–roughly what we expect  
    * Post on channel, no need for deep dive since they should be similar enough  
    * Campaigns make sure numbers all work good  
  * Deprio: Update plan for replacing case statements with the new system \+ send to albert  
  * Implement case statement system  
* Ongoing:  
  * Chat more about greenhouse analytics  
  * … other smaller tasks, more Inngest → Temporal migrations  
  * Certus check in again, alan poc  
  * Tragar data \+ classifier tuning for analytics dashboard rollout

## Feb 5, 2026

* Completed:  
  * Move populate analytics \+ sync mat view to Temporal **PR:** [10595](https://github.com/cybernetic-ai/blackbird/pull/10595)  
  * Temporal alerting for schedules that aren’t populated **PR:** [10656](https://github.com/cybernetic-ai/blackbird/pull/10656)  
    * Change to HIGH alert  
* For today:  
  * Inngest, temporal: **make sure Inngest not running anymore, pause on UI**  
    * **Done\!**   
  * Move remapInteraction from lib/inbound/query to interactions\_reason mat view\!  
  * Interaction reasons override backfill [NET-5350](https://linear.app/netic/issue/NET-5350/interaction-reasons-override-for-old-thread-data) **WIP**  
  * Work on moving over more analytics workflows to Temporal  
  * Job history table in service titan for Post Transfer [NET-5351](https://linear.app/netic/issue/NET-5351/populate-more-post-transfer-events-using-job-history-table-in-service)  
* Ongoing:  
  * … other smaller tasks  
  * Replacing case statements with the new system  
  * Certus, alan poc  
  * Tragar data \+ classifier tuning for analytics dashboard rollout  
  * Post transfer recording

## Feb 4, 2026

* Confirm CERTUS issues were fixed from before (transfer logging)  
  * Bumped them, no response :(  
  * Bumping again yesterday :(  
  * **Bump one more time → Alan**  
* Feedback on [\[WIP\] Classifier System Refactor](https://docs.google.com/document/d/1iTNrrSy7vVU1BQGwcsz5UaKZCOWWKivz9EBG1W9xKhM/edit?tab=t.0) – sending implementation for replacing case statements  
  *   
* **Move analytics ingest functions to temporal**  
  * **Have something ready for task-and-classification**  
  * **PR:** [10595](https://github.com/cybernetic-ai/blackbird/pull/10595)  
  * Awaiting testing bc i think jessica didnt push her script  
  * Pushed in  
  * Done  
* **Interaction reasons override**  
  *    
* Pending:  
  * Post transfer recording \+ transcript frontend – make linear ticket  
  * Tragar – training QAs 

## Feb 3, 2026

* Mar 16 \- 21 mention in party submit on Rippling  
  * Submitted  
* EnergyAid done, backfills done  
* Confirm CERTUS issues were fixed from before (transfer logging)  
  * Bumped them, no response :(  
  * **Bumping again today**  
* Tragar DC working on data pull  
* In progress for EOD:  
  * Move analytics ingest functions to temporal  
    * Starting with `task-and-classification` and `sync-monitor` related functions  
    * Separate the PRs → one to put in the temporal function but pause the cron in code in Inngest function  
      * Let it simmer for a few hours  
    * There are lots others we want to move as well (job value, etc.)  
  * Copy over interactions reason into override for threads  
  * Feedback on [\[WIP\] Classifier System Refactor](https://docs.google.com/document/d/1iTNrrSy7vVU1BQGwcsz5UaKZCOWWKivz9EBG1W9xKhM/edit?tab=t.0) – sending implementation for replacing case statements  
    * **Ill add comment to show what piece**  
* Post transfer recording \+ transcript frontend  
* Add to linear the small ticket items below  
* [\[WIP\] Classifier System Refactor](https://docs.google.com/document/d/1iTNrrSy7vVU1BQGwcsz5UaKZCOWWKivz9EBG1W9xKhM/edit?tab=t.0)  
  * Adding post call transfer classifications remapping to it  
    * Adding to materialized view, can be on top of interactions\_reason  
  * Standard in public schema: `_v` and `_mv` for views/mat views

## Feb 2, 2026

* Bruh fix `analytics.interactions_reason_override`  
  * Serial big int → uuid migration  
  * :ty: albert yue [10445](https://github.com/cybernetic-ai/blackbird/pull/10445)  
* Backfill `should_run_analytics_v2`  (session) and `should_run_analytics` (session \+ ipc) for all interactions that we backfilled for pest  
  * **Run for all multi FSM tenants**  
  * done\!  
* Confirm CERTUS issues were fixed from before (transfer logging)  
  * Bumped them, no response :(  
* Fix energy aiddd  
  * Pushed the change to the backfill, got our similarity much closer  
  * Looking further into the data here: [Energy Aid Classifier Results](https://docs.google.com/spreadsheets/d/1vFIyxHqGHXNkbfWu6Fmx-o4x9XI-iG-AvGqT2uKmGtk/edit?gid=1325784787#gid=1325784787)  
  * **Done\!\!\!\!**  
* Post transfer recording \+ transcript frontend  
  * See example below from weekend  
* **Move any analytics ingest functions to temporal**  
  *   
* **Interaction reasons override**  
  * Need to copy over old thread data into that  
  * Copy over existing classifications and override  
  * **Figure out clean way to show the data**  
  * ilike thread\_%  
* **Job history table in service titan for Post Transfer**   
  * Rescheduled or canceled job\!\!  
  * \<\> st call id  
  * Add to moirai  
  * What calls are canceling / rescheduling after transfer  
  * Using it for leads or non leads → becomes another section of actions taken post transfer  
  * **Basic event table?** Change post interaction job to support more than just job\_created  
* **Emergency service in v2 doesn’t show up as emergency service \- pre transfer**  
  * Sparky we just transfer, we will need some kind of action to do this  
    * Still count as emergency service even though its transferring – still should be part of combined booking rate  
  * call / session \<\> emergency\_case should be most reliable  
    * There is question of how far back this exists though  
    * Action \= EMERGENCY\_NOTIFIED session or ipc  
    * Look at analytics CRONS to double check how each get identified  
  * Make it do that.  
  * Trade → unknown business unit  
  * **Separate node?** Separate sub reason? Business unit \= “Emergency service”?   
  * Make sure it doesn’t change combined booking rate  
* **Add post-transfer classification results into a unified mat view**  
* Work on [\[WIP\] Classifier System Refactor](https://docs.google.com/document/d/1iTNrrSy7vVU1BQGwcsz5UaKZCOWWKivz9EBG1W9xKhM/edit?tab=t.0)  
  * Better visualization for case statement issue – not much we can do about the complexity  
  * Make section for tooling  
* Timeline: Tragar EOW, CERTUS asap, Energy EOD, post transfer **wednesday/friday fallback**, classifier system EOD  
  * ASAP: Certus  
  * EOD: classifier system technical implementation write up, Energy Aid **Done\!\!\!\!**  
  * EOW: Tragar, post transfer recording

## Weekend

* Build out frontend for post transfer recording \+ transcript  
  * ![][image9]  
  * Got a basic version, will work with Os to clean it up^ (currently functional in my branch)  
* Backfill `should_run_analytics_v2`  and `should_run_analytics` for all interactions that we backfilled for pest  
  * Done  
  * Lookout Pest – all tenants?  
* Take a look at energy aid issues, set forth plan to fix  
* Work on [\[WIP\] Classifier System Refactor](https://docs.google.com/document/d/1iTNrrSy7vVU1BQGwcsz5UaKZCOWWKivz9EBG1W9xKhM/edit?tab=t.0)

## Jan 30, 2026

* Backfill on the zipcode  
  * ![][image10]  
  * No zip code found for eu above^  
  * **Do u know where it is?**  
  * Delete the entire address row for this end\_user  
* Energy aid data run results  
  * Results can be found here [Energy Aid Classifier Results](https://docs.google.com/spreadsheets/d/1vFIyxHqGHXNkbfWu6Fmx-o4x9XI-iG-AvGqT2uKmGtk/edit?gid=1325784787#gid=1325784787)  
  * Only 82.4% on lead classification, 89.6% if you remove price shopping misclassifications  
  * **Really weird, need to look much deeper into this**  
* Certus data run results  
  * Results can be found here[Certus Classifier Results](https://docs.google.com/spreadsheets/d/1YIkv6CRy4B5VCTiDwgTG1fvRUxusNY6CUlxnJ6HFXzk/edit?gid=0#gid=0)  
  * 97.9% on lead classification  
  * 86.2% on category classification (97.3% if you don’t consider “transferred”)  
    * **Found big issue, transfer cases not being logged when transferring live**  
    * Example call ids: e556bc44-271e-46d3-b7f1-d80ccc75e23f, cdd3efd2-7066-45b3-a0fb-dbab78aea33d, dffaddb8-29e2-4daa-92df-c3a4852e9076, 84d5b669-b8a7-4cb5-b310-6ca2ba830bcd, … 102 more  
    * Talk to [Davin Jeong](mailto:davin@netic.ai) or [Alan Yu](mailto:alan@netic.ai) about this^  
    * **“Finalizing\_sale” AND “booked”**  
* Tragar  
  * **TBD? Get timeline from DC**  
  * Early next week  
* Working on technical implementation now [\[WIP\] Classifier System Refactor](https://docs.google.com/document/d/1iTNrrSy7vVU1BQGwcsz5UaKZCOWWKivz9EBG1W9xKhM/edit?tab=t.0)  
  * **Will start working on**    
* **Nice to have:**  
  * Post transfer recording \- talk to [Osmond Wu](mailto:osmond@netic.ai)  
  * **Build a preliminary version then iterate with Osmond if need be**  
    * This weekend  
  * Qa dash tickets if easy / fun 🙂  
* **Timeline:** draft refactor by tomorrow design iterations,  
  * Certus EOW   
  * Tragar EONW (end of next week)  
  * Next week pushing on the new classifier system

## Jan 29, 2026

* Check zipcode affects on Certus / Lookout Pest (all pestpac)  
  * Run backfill on `public.analytics` table  
  * [Albert Yue](mailto:albert@netic.ai) to get phone numbers for backfill  
  * \+19193984416  
  * \+19512042398  
  * \+14237020049  
  * May not be in population for the table  
* Run dashboard data against energy aid data [https://neticai.slack.com/archives/C09LJC9U36K/p1769673412792909?thread\_ts=1769671964.546519\&cid=C09LJC9U36K](https://neticai.slack.com/archives/C09LJC9U36K/p1769673412792909?thread_ts=1769671964.546519&cid=C09LJC9U36K)  
  * Rerun and confirm data quality for Energy Aid  
* **Tragar, Certus data (DC sending today)**  
  * Update classifiers as needed  
* Working here [\[WIP\] Classifier System Refactor](https://docs.google.com/document/d/1iTNrrSy7vVU1BQGwcsz5UaKZCOWWKivz9EBG1W9xKhM/edit?tab=t.0)  
  * Feedback on functionalities  
* **Nice to have:**  
  * Post transfer recording \- talk to [Osmond Wu](mailto:osmond@netic.ai)  
* **Timeline:** draft refactor by tomorrow design iterations,  
  * Certus, tragar eow  
  * Next week pushing the new classifier system

## Jan 28, 2026

* Tragar booking state backfill pushed in, [live internal dash here](https://tragar.netic.ai/dashboard/analytics/inbound?interactions-reason-drilldown-sankey=true)  
  * Booking state forward fill for Tragar: PR [10201](https://github.com/cybernetic-ai/blackbird/pull/10201)  
  * **Why don’t we have a \#tragar-product channel?**  
  * **Ask DC for any tragar data we may have to run evals of data against it**  
* Continue work on Certus  
  * Bump DC for the more up to date data  
  * Get evals here, make any necessary changes to classifiers  
* Talked to jessica about bay club, incorporated it to WIP classifier system  
* Quick chat here: [\[WIP\] Classifier System Refactor](https://docs.google.com/document/d/1iTNrrSy7vVU1BQGwcsz5UaKZCOWWKivz9EBG1W9xKhM/edit?tab=t.0)

## Jan 27, 2026

* For backfill: take a look at tables using transfer\_case  
  * Try to avoid the 15 marks when campaigns/analytics run  
  * Worst case increase timeout manually in SQL  
  * Try running a few times and lock clears up usually  
* CERTUS analytics  
  * Davin POC for implementing transfer logging changes, meanwhile running evals against DC’s old data  
    * Old data doesn’t have “booked” state  
* Tragar analytics  
  * Looking into it today and calling out any required changes from others (transfer logging, etc.)  
  * Work with DC to get data to use for evals here as well  
  * Booked jobs using session\_type\_state  
* Meanwhile, design spec for new classifier tables \+ evals system  
  * Still WIP [\[WIP\] Classifier System Refactor](https://docs.google.com/document/d/1iTNrrSy7vVU1BQGwcsz5UaKZCOWWKivz9EBG1W9xKhM/edit?tab=t.0)  
    * Could think about filters if we want to  
  * Go through iterations with albert, alan  
  * Assume some kind of table or some way to determine whether or not we need to run some classifiers  
    * Should happen upstream  
    * For calls, run on call ended  
    * Text, on some interval or session ended (a bit iffy of a concept though, can’t distinguish between a break in convo and an end very well)  
      * Will need some kind of periodic rerun of analytics  
* **Timeline:** draft refactor by tomorrow design iterations,  
  * Certus, tragar eow  
  * Next week pushing the new classifier system  
* Other stuff:  
  * Bay club exists, very different – sell memberships  
    * **Talk to jessica so it can fit into the classifier system**  
  * Axe and wire – fencing company, install? New FSM. Davin, Xinyi, Alan

## Jan 26, 2026

* Get sign off on data for Energy Aid rollout  
  * Emma said to hold off, keep internal  
* Fix filter issues  
  * PR: [10065](https://github.com/cybernetic-ai/blackbird/pull/10065)  
  * PR: [10111](https://github.com/cybernetic-ai/blackbird/pull/10111)  
* Talked with Emma, we want a rollout for CERTUS analytics before post transfer work  
  * Will need backfill of transfer reasons here  
  * \+ Forward fill of transfer reasons (write to `transfer_case` \+ `escalation_status`)  
  * \+ addt’l Booked state definition and backfill  
* THEN post transfer   
* Write out design spec for new classifier tables \+ evals system  
  * WIP doc will be here [\[WIP\] Classifier System Refactor](https://docs.google.com/document/d/1iTNrrSy7vVU1BQGwcsz5UaKZCOWWKivz9EBG1W9xKhM/edit?tab=t.0)  
* Questions for albert:  
  * **TRAGAR** – separate FSM, assumption is Certus before Tragar  
  * **Thoughts on this plan:** do certus, then tragar, then post transfer for all new tenants, meanwhile work on new classifiers system  
    * Works, emma confirmed too

## Jan 23, 2026

* From Emma’s note about last\_minute\_reschedule fix: [9898](https://github.com/cybernetic-ai/blackbird/pull/9898/files)  
  * Found 684 cases where `transfer_case.reason =` `last_minute_reschedule` while the interaction is considered as `lead`– these tend to be cases where they object timing or want emergency service, should i add that as a transfer note rule? Not sure why it doesn’t show up for classifying note transfer  
  * **Ideas on the backfill / better reason to use? Make new rule?**  
  * ![][image11]  
  * **TODO: make new rule** [9898](https://github.com/cybernetic-ai/blackbird/pull/9898/files)  
* Noticed we build baseQuery for inbound drilldown data off of `public.analytics` which isn’t a mat view, why do we do this?  
  * For Energy Aid \+ Pest, I had to build off of `interactions_reason` since public.analytics only filled for service-titan booking providers  
  * Ideally we build analytics breakdown data of the same table  
  * Analytics has values for filters, don’t exist in `interactions_reason`  
    * **Long term, filters table to join**  
    * [9910](https://github.com/cybernetic-ai/blackbird/pull/9910)  
* Frontend for energyaid (made it more general to support both energyaid, pest, and future simple rollouts of analytics when `public.analytics` isn’t being filled for these customers)  
  * PR: [9910](https://github.com/cybernetic-ai/blackbird/pull/9910)  
  * **Should work on having everything build off the same baseQuery**  
* Make sure forward fill for booking definition for Energy Aid is getting updated  
  * PR: [9912](https://github.com/cybernetic-ai/blackbird/pull/9912)  
* **THEN:**  
  * The Booking rate seems sus for Energy Aid, its really low like 20% (see image below)  
  * DC said that is to be expected  
    * Confirm the data looks good with some more manual review by DC  
    * **Then ship it\!\!**  
  * Should we work on post transfer analytics for pest / energy aid?  
    * **Question for how fast EMs think we need this for customers**  
    * Do other tenants have a nice concept of a call? This is how we fuzzy matched post-call bookings  
      * Mostly necessary for backfill in history  
    * **Build out our own post transfer booking stuff with post transfer recording and have some way to switch between?**  
  * OR go into the new classifiers system (data flow of tables, task\_observation table, no longer using interactions\_reason mat view for updates, **evals,** etc.)  
    * [Thomaz Bonato](mailto:thomaz@netic.ai) **Write up a design doc, go through some iterations**  
    * Multi task prob not pushed for another month  
    * **Evals\!**  
    * **Handling prioritization (of IR mat view) in DB instead of codebase**  
  * Managing transfer rules on both agent and analytics level  
    * More DB than in codebase  
  * OR go into analytics v2 that uses an event driven system (booked\_jobs, transfer\_case, appointment\_reschedule, appointment\_cancel, etc.)  
    * Dependent on internal multi FSM data model, wait a little bit here  
    * Alan leading this  
      * Doc: [\[WIP\] Lead Management Center - Greenhouse](https://docs.google.com/document/d/1c52IwELk0t3A9EdwDi_0Sh1yEHc-bM4K8rOoaxsJocI/edit?tab=t.0#heading=h.7esp313iqyzp)  
  * OR consistent cancel reasons across all tenants, have some set that we can give to EMs? \~wait a bit

![][image12]

## Jan 22, 2026

* New interactions\_reason migration with nicer display names [9856](https://github.com/cybernetic-ai/blackbird/pull/9856)  
  * What do I have to do to update the perms and prevent the issue shail had to fix?  
* Data iterations with DC and Farah’s data  
  * Just continue executing here, making changes to classifiers as needed  
  * Going through the data and looking for errors to update  
    * Many Price Shopping got considered as lead by DC and Farah  
    * [Energy Aid Classifiers Data](https://docs.google.com/spreadsheets/d/1XtQdvLFuICmdKxtyo8h0QaB6UxMb_Jfs1ThD7RUPU6A/edit?gid=64692738#gid=64692738)  
* Building out frontend with feature flag for Energy Aid  
  * Having some weird issue with rendering locally to work on the frontend  
  * ![][image13]  
  * Even though the `NEXT_PUBLIC_DEVELOPER_ACCOUNT_DOMAIN` is energyaid.netic.ai, it still thinks its lookoutpest. It may be cached, is there some way to delete?

## Jan 21, 2026

* **Make changes based on data review from DC on Energy Aid analytics**  
  * Data to review is here: [Energy Aid Classifiers Data](https://docs.google.com/spreadsheets/d/1XtQdvLFuICmdKxtyo8h0QaB6UxMb_Jfs1ThD7RUPU6A/edit?gid=383697398#gid=383697398)  
  * Checking `Booked` status via session\_type\_state  
    * We should have a better way of tracking this, its beginning to become quite gross  
    * New table? ← this would be part of the `event_driven` analytics  
    * **Linear ticket**  
    * booked\_jobs table  
    * **POC: Teddy, confirm the book status**  
      * **Sent in**   
* **Escalation reasons backfill is up\!**  
  * Make changes to inbound query for pest to show in frontend  
    * **Done\!**  
  * Change interactions\_reason for better client facing names  
    * PR: [9856](https://github.com/cybernetic-ai/blackbird/pull/9856)  
* **Bump Alan again on forward fill for live transfers and escalations**   
* Doc for Netic analytics onboarding[Netic Metrics](https://docs.google.com/document/d/1_w3Hjq5m0c3LI80tF8AiIffZY7PsZALX6_M0r0Ar650/edit?tab=t.q6kqh6ikr7fa#heading=h.jpj3j7wuo9wy)  
* Ongoing:  
  * Build out frontend for energy aid  
  * Make sure transfers are in for energy aid

## Jan 20, 2026

* Moving Friday sync to 11am (switched another class)  
* Fix analytics sync (no response not showing up in not enough info): [9733](https://github.com/cybernetic-ai/blackbird/pull/9733)  
  * Still need a review please :)  
  * Also need to add to `lead_status_with_unknown` \= “NOT\_ENOUGH\_INFO” if transcript is null for call  
    * All tenants with analytics rn are having “No response” show up as non lead for some portion of those with no interaction  
  * Weird differences in requested human getting mapped to not enough info too  
  * **Check for transcript null for not enough info**  
    * [9742](https://github.com/cybernetic-ai/blackbird/pull/9742)  
* Exposing transfer reasons backfill to frontend and interactions\_reason  
  * `escalation_status` table doesn't seem to be populated by Lookout Pest  
  * This is necessary for forward fill of escalation status  
  * This was for [Alan Yu](mailto:alan@netic.ai) todo  
* Working on energy aid analytics  
  * Getting cut of data by EOD for DC review   
* From Emma’s comment  
  * *@Thomaz @Albert Yue do we have a sense for when we will have the non-lead breakdown across handled vs. not handled and subcategories?*  
  * Thoughts? Focus on EA analytics for now, right?  
  * **Confirm with Emma**  
    * She meant the transfer breakdown stuff

## Jan 16, 2026

* Async update (Albert OOO)  
* Working on getting transfer cases shipped  
  * Data review here [Check Lookout-Pest](https://docs.google.com/spreadsheets/d/1FE_5hERvuAt5SGqiCMB7eRIvVI4tcoYsuHr4UoGAYX8/edit?gid=95408819#gid=95408819)  
  * Interaction reason mat view changes after running the backfill  
  * Frontend changes  
* Then, energy aid analytics

## Jan 15, 2026

* Schedule change – changed friday class so moved up call **all calls** – double check  
* Backfill `escalation_reason`  
  * Have script ready, gonna walk through a few and make sure they look good  
  * First write to json, then write to transfer\_case?  
    * How can i make sure the frontend doesnt change now?  
    * Will prob have to make changes to interactions\_reason  
    * **Double check it shows up as raw reason**  
      * If not → write to it onConflict replace,   
      * If escalated is true: took\_note, escalated\_with\_note, false  
      * Else: no\_transfer, user\_hung\_up, false  
        * User\_hung\_up → pull from retell call disconnect reason not stored?  
        * [Alan Yu](mailto:alan@cyberneticlabs.ai) to populate retell disconnect reason within `session_type_state`? Forward fill, should write to escalation\_status  
        * Home services is in inbound\_phone\_call  
      * **Backfill all interactions\!\!**  
* Work through changes DC brought up  
  * **[Albert Yue](mailto:albert@netic.ai)** noticed explicitly requests human is masking some leads like this: 29e4f19e-31c7-41a1-a927-5213b37d5365  
    * Should be lead but isnt, is `explicitly_requests_human` masking it?  
    * Tune intent classiifier  
      * Script – eval-intent classifier  
      * Have something for pest   
  * Add to manual override table  
    * **Added the no response**  
      * `TODO` Debug why these arent getting task, classification rows  
  * `TODO` Improve classifiers with DC data– thoughts on doing this? I think its becoming really important to have an evals system. Should prob do after energyaid  
* Drop `call_outcome` from `qa_notes`, lin tick:   
* THEN EnergyAid

## Jan 14, 2026

* **Check back in with Emma, DC about what other data to backfill (have 12/22 → 1/05 up)**  
* **What are we doing about transfer reasons? Backfill**  
  * Merge in davin? No  
  * Backfill → default to the transfer\_department, then run global transfer reasons?  
  * Whatever best matches the data  
    * CUSTOMER\_CARE should prob have global transfer rule classifier run first  
    * … test on a few calls  
  * **Change drilldown integrated table titles \+ the default to Booked or smth**  
  * **Eventually ISP/OSP \+ pest type?**  
  * **Question for Alan**  
    * Do we say non leads are all non live escalations? Or handled can be appt. Cancellation, rescheduled, etc.?  
* **THEN**  
  * EnergyAid analytics  
* Schedule / expectations  
  * As I get back into school, I’ll have other responsibilities beyond the 20 hours at Netic (school, clubs, etc.) – would like more support as I work on more important projects (multi fsm, analytics data model v2, etc.)  
    * Last two days have been 7 hour days each so I want to minimize that since it puts me in a bad position for the remainder of the week

## Jan 13, 2026

* **Backfilling manual classifications** ([NET-4626](https://linear.app/netic/issue/NET-4626/backfill-pest-human-labeled-data))**:**  
  * 1\) backfill with reverse mapping, worked with cursor to get a reverse mapping → then check if this has applied correctly and manually change any outstanding differences  
    * Incorporate source \= human\_override / manual\_override / human  
  * 2\) make a new table that gets coalesced with flattened\_interaction to build up interactions\_reason  
    * **I prefer this: supports manual overrides without a messy reverse mapping \+ is more what we care about long term**  
    * **Maintains the “ground truth” data format** – aka we don’t know for sure what all classifications and tasks would’ve been if, say, an appointment was booked (was there price shopping, objection, etc.?)  
    * 2 tables? → could be view  
      * Manual table \+ change interaction\_reasons. **1 table only for now**  
  * Backfill has ran on everything– in `interactions_reason_override`:  
  * **Complete (12/22 \-\> 1/05)**  
* **Run backfill on NEW\_APPOINTMENT intent calls before today**  
  * Make sure we run task classifier ONLY if not resolved booking  
  * Make sure we are still checking `session_type_state` in case it has the service\_oder\_id field  
  * **Complete**  
* **Backfill transfer reasons using Davin’s reasons if [Albert Yue](mailto:albert@netic.ai) checks off Davin’s PR \+ enum set** ([NET-4625](https://linear.app/netic/issue/NET-4625/backfill-transfer-reasons))  
  * Davin’s PR: [9457](https://github.com/cybernetic-ai/blackbird/pull/9457)  
* **Get data for DC to review both transfer stuff and the manual backfill**  
* **Revisit frontend and populate with all new info ([NET-4627](https://linear.app/netic/issue/NET-4627/update-frontend-with-all-data))**  
  * Issue: some Excused and No Response not moving to not enough info  
  * **Complete**

## Jan 12, 2026

* Friday \-\> Mon OOO for Albert  
* Pestpac Data  
  * Add book state exists to [9416](https://github.com/cybernetic-ai/blackbird/pull/9416)  
    * `pestPacSalesBookingState` is the state  
    * `app/api/pestpac/sales-booking/route.ts` is where I set the state  
    * And `service_order_id` is the "ID" in pestpac  
  * Then merge it in ^  
    * **Completed**  
  * **Added, run backfill with \[this\]**  
* Run backfill on classifier data so we can go off of intent, task, etc. **\[this\]**  
* Frontend stuff to show reason/sub-reason  
  * Call “Unbooked” → Non-live Escalation  
  * Send to review  
  * Excused and No Response gets move to not enough info  
    * \*should be getting mapped in not enough info  
* Data flow doc for reference by Alan  
  * [Albert Yue](mailto:albert@netic.ai) will do  
* **Add some way to backfill manual classifications**  
  * Script on local  
  * Infra for prioritization  
  * `interactions_reason`   
  * Add source \+ version column to task, classification (“manual”, “1.0.0”)  
    * Index on source, version ordering  
  * LEAD, BOOKED  
  * On flattened\_interaction define prioritization  
  * **Get \# of rows that have disagreements, if easy then manual, if hard then come back and talk**  
  * **Lead level, category level, reason, subreason disagreements**  
* **Look into reason/sub reason**  
  * Get \~equivalent mappings (no response \= , new accuracy numbers  
  * Rough accuracy numbers to Albert  
  * Mismatches as spreadsheet to DC  
* THEN work on transfer reason / non-live escalation backfill for Pest  
  * Talk to [Davin Jeong](mailto:davin@netic.ai) for the final set of reasons, check in to see if he can support more on backfill??  
  * [Albert Yue](mailto:albert@cyberneticlabs.ai) to check with Alan, Emma on prioritization, and Davin to implement logging to `transfer_case`  
* Ongoing:  
  * EO next week EnergyAid analytics  
  * **Backburner: Eval system yay doc LINEAR TIC NET-4623**  
  * **Backburner:** Book state classifier:   
    * Werent updating state, so no bookkeeping steps due to ST API call  
    * Analytics and state werent getting filled in  
    * Cost is not a worry  
    * Slack notification and then backfill  
    * **Linear ticket** 

## Jan 9, 2026

* Finish up work of integrating into pipeline \+ run against DC, Farah details **by TONIGHT**  
  * Adding new classifiers for Booked resolve outcome  
  * Making changes to other classifiers as necessary to map closely to DC, Farah for Handled reasons, Unbooked reasons, etc.  
  * Populating the frontend  
    * \+ add banner to the top giving lead rate (not incl. Not enough info) \+ booking rate  
    * **Same as existing banner**   
  * Addressing all of Emma’s comments   
    * Get reason why booking rate %, what is impacting it? Check for lead count via triage and then booking definitions  
    * [https://neticai.slack.com/archives/C0A4T4NCZM4/p1768010101296169?thread\_ts=1767932960.742659\&cid=C0A4T4NCZM4](https://neticai.slack.com/archives/C0A4T4NCZM4/p1768010101296169?thread_ts=1767932960.742659&cid=C0A4T4NCZM4)  
  * Fix classifier sync logic: [9416](https://github.com/cybernetic-ai/blackbird/pull/9416)  
* Then, **by EOD Monday**  
  * Transfer backfill pending our decision on how to classify  
  * Booking, rescheduled, etc. “resolved” → booked/ handled  
  * IF `Unresolved` task then → non-live escalations  
  * Sub-reasons, run classifier on the escalation\_reason  
    * Natural language reduced to categories  
    * Part of backfill  
    * [Davin Jeong](mailto:davin@netic.ai) is implementing via similar enums, classify into those  
      * Timeline?  
* **Send brief bullets into lookout pest prod channel**  
* Then, if time  
  * Adding task\_observations \+ task\_state to pipeline to handle llm checking for booking \+ manual booking case  
    * Will this be necessary long term?  
    * Supporting manual overrides for classification  
    * manual \> mechanical \> llm

## Jan 8, 2026

Async update due to traffic to airport. Note will be unavailable 5pm PST to \~10am PST as I will be flying back to NYC then driving to Boston. Here is the update from today:

* Merged new filtering with enabled options outside of ST to Pest sankey  
* Merged Not enough info  to Pest sankey  
* Talked to Davin about using transfer\_case  any time we transfer in Pest, using similar set of transfer reasons as existing transfers  
* Working on having Pest integrate into existing classifier pipeline with some minor changes to defining booking (@Alan Yu lmk when we have booking state and I can integrate it)  
  * This will allow us to hit P2 points — unbooked reasons, handled breakdown, etc.  
* Only outstanding item we need to plan is how we will backfill “non-live escalation” (what do we even want to show here?) transfers

cc: @Albert Yue

## Jan 7, 2026

* Frontend live under feature flag  
  * Resolves [NET-4517](https://linear.app/netic/issue/NET-4517/lookout-pest-v0-analytics)  
* Analytics nit related to `PermitsAppointment` [9311](https://github.com/cybernetic-ai/blackbird/pull/9311)  
* Lookout  
  * Working on getting it integrated into the existing pipeline under new classifiers  
  * **Will get us reason, subreason on handled, unbooked, etc.**  
  * Still wont have info on jobs booked (reason, sub reason) since we don't have a booking flow yet OR info on transferred since we dont really transfer  
  * Only changes to classifiers:  
    * Test existing intent \= NEW\_APPOINTMENT classifier against ground truth data, make tweaks if necessary  
      * Diff intent classifier for pest is fine  
      * Versioning column?  
    * New appointmentBookOutcome classifier (will have it override with `ClassifierOptions` temporarily)  
    * Compare remaining data against ground truth to see discrepancies  
  * THEN, adjustments to frontend  
    * Add back in the filters at the top, add drilldown table below except for `Booked`   
  * Transfers  
    * **\[P0\]** Check if we are writing into `transfer_case` and if not chat with Davin and build some way to backfill  
      * We do not :( 🙁  
      * Put in \#lookout-pest-product

P1:

* Filters → date filter and time adjustment UI [9326](https://github.com/cybernetic-ai/blackbird/pull/9326)  
* Not enough info [9353](https://github.com/cybernetic-ai/blackbird/pull/9353)  
  * Run on interaction\_reasons → lead\_status\_with\_unknown looking for specific reasons/sub-reasons  
  * Majority is no response   
* If we transferred, log a case  
  * What is considered a transfer?  
  * `Escalation_reason` ?

P2:

* Unbooked reasons, and similar reasons

## Jan 6, 2026

* Implemented Lookout v0 plan: [Lookout Pest v0 Plan - Thomaz](https://docs.google.com/document/d/11faqvHE8er0av57kmrODKEInmCKViqPUwYvbZV9HGoU/edit?tab=t.0)  
* By EOD: build out dashboard analytics sankey for Lookout Pest  
  * ~~Feature flag frontend?~~ → copy container at top and make changes to that one, if pestpac show pest container or tenant id  
  * Make temporal function that runs every X **(15 is fine)** minutes to update `temp_pest_analytics` with script in `scripts/analytics/pest/*`  
    * `have function work on single call basis`  
  * **THEN** build out handled / unhandled classifiers  
  * **THEN** build out remaining classifiers (unbooked, etc.) based on the recorded data in DC’s [\[Internal\] Lookout Pest](https://docs.google.com/spreadsheets/d/15_6WyWUH4Fa2e9mE4LiwvwR4tDVL-17zA8pEqB-ff_c/edit?gid=1862528718#gid=1862528718) for accuracy  
  * **Think about abstracting things**  
    * Need new, more robust classifier system  
    * Need new, more robust data model  
      * Task, classifier, mat views, etc.  
* Abstraction idea for data model:  
  * from `customer_interaction` as trigger:  
  * `task` checks for task existence in an interaction  
  * `task_observation` houses all outcome signals there (triage, llm, crm, human override) – signal\_type, signal\_type\_version  
  * `task_state` derivation (materialized view) using `resolution_ruleset` (for x task, when y \= resolved and z \= resolved, prefer a)  
    * `resolution_ruleset`  
      * 1 row per (task\_type, version/name)  
      * Example: 1 row for NEW\_APPOINTMENT / "v1"  
    * `resolution_rule`  
      * Typically 4–10 rows per ruleset  
      * explicit per-source and per-outcome (clear \+ deterministic)  
      * Create 2 rules per source (one for RESOLVED, one for UNRESOLVED), ordered by priority (number from 0 to …)  
      * Removes need of redoing mat view  
      * Can have default value (default column \= yes) and tenant\_id column optional for specific tenants wanting different ordering  
  * Each `task_state` can trigger attribute collection based on rules in `attribute_trigger`   
  * From triggers, we build `attribute_state`, housing all the info classification used to house  
  * Replace `interactions_reason` CASE with `interaction_analytics` derived via `analytics_rule` and `analytics_ruleset` tables similar to `resolution_rule/set`  
  * Sankey aggregates from `interaction_analytics`.  
  * [https://www.mermaidchart.com/d/90073c25-02b7-4eb7-a73c-e1f31c0d51ed](https://www.mermaidchart.com/d/90073c25-02b7-4eb7-a73c-e1f31c0d51ed)

* Ongoing:  
  * EnergyAid analytics  
  * Caccia, Service professionals – adjusted booking rate without ES?

## Jan 5, 2026

* Fixing timestamp mismatch in \#alerts channel  
  * PR [9215](https://github.com/cybernetic-ai/blackbird/pull/9215) if i could get review  
  * Can also run a backfill so we dont lose recordings \+ analytics  
    * **[Thomaz Bonato](mailto:thomaz@netic.ai) todo today/tonight**  
  * Script will be in `scripts/` in another PR as soon as im done fixing the issue  
* Plan \+ deadline for EnergyAid  
* Lookout Pest basic analytics  
  * Sankey  
  * Booked job definitions  
  * Classifier changes?  
* Lookout Pest  
  * A lot of differences  
  * EOW analytics by Friday  
  * \#1: Total volume, \# leads, booking rate (aka sankey without the bottom–lead, booked, unbooked)  
  * \#2: Caccia, Service Professionals – how we want to show adjusted booking rate, ES does not counts  
* One new table for all multi FSM stuff  
  * For now separate tables is fine  
  * Mat view for final table  
  * Rely new table  
* Deliverables:  
  * First priority: \# leads, non leads, booked, unbooked  
  * New table  
  * Last priority: Handled classifier try to run on non leads  
* [Lookout Pest v0 Plan - Thomaz](https://docs.google.com/document/d/11faqvHE8er0av57kmrODKEInmCKViqPUwYvbZV9HGoU/edit?tab=t.0)

## Dec 30, 2025 \- Jan 2, 2026 OOO (in Brazil \- BRT, PST+5hrs)

## Dec 23, 2025 \- Dec 26, 2025 OOO (in Brazil \- BRT, PST+5hrs)

Dec 15 \- Jan 8 in Brazil (PST \+5hrs)

## Dec 26, 2025

* Ipc transfer transcript \+ duration stuff  
  * PR [9008](https://github.com/cybernetic-ai/blackbird/pull/9008)

## Dec 22, 2025

* Presenting energy aid implementation plan here: [EnergyAid Analytics – Implementation Plan](https://docs.google.com/document/d/1wpC8akYbS2u2kCIk7nOU7MczZvVokHibVB0sxJuLHOo/edit?tab=t.0#heading=h.yya7fa0qg9p)  
* Finish transfer\_transcript and have it show up in tools for transfer audit in ZK  
  * Write to ipc on transfer-call-ended (PR incoming)  
  * Backfill with existing GCS diarization urls in db

## Dec 18, 2025

* ZK audit tool PR [8752](https://github.com/cybernetic-ai/blackbird/pull/8752)  
  * Weird linting error in ZK, any idea how to fix?  
  * Ran `pnpm lint` but got no warnings  
* Add ST call pull to on call tools  
  * Did manual pull yesterday  
  * Zi asked for it  
  * PR [8756](https://github.com/cybernetic-ai/blackbird/pull/8756)  
* Bug bashing transfers \+ working on the linear tix  
* Write transcript to ipc \+ backfill part of the linear tix  
  * Part of   
* EnergyAid plan by Monday?

## Dec 17, 2025

* Sent race condition PR on started call  
* One big PR is fine for ZK audit tool  
  * Send video of how it works  
* Bug bashing \+ linear tix  
* EnergyAid plan  
  * Spec about new columns, adding energy aid classifications into db  
  * New cols, tables? Schemas? Intermediate tables?   
  * Timeline  
    * → Hex dash \+ data for audit  
  * POC? EnergyAid transition main is Thomaz, during OOO albert can help if we need to push  
* Submit OOO in Rippling ✅

## Dec 16, 2025

* Setting up linear tix  
* Merge in PR [**8637**](https://github.com/cybernetic-ai/blackbird/pull/8637) and follow up data to make sure everything is good  
* Existing issue: some calls try to initialize recording even though call hasn’t started yet – race condition  
* Working on custom file naming for improved backfilling  
* Energy aid plan by monday ? hopefully   
  * 🙏- albert

## Dec 15, 2025

* Linear:  
  * Continuous → 1 ticket part of   
  * Split into tickets  
  * Use it\! Helps ops and eng to follow along  
  * Ontology: Milestone → Issue → Sub-issue  
* Weird issue with some calls  
  * Not duration of 0 but still errors on telnyx\_recording\_url: agent recording  
  * v3:qUibiXl5QOPc7LtYpveDLkAsH7Un-jKksDG5R-fDmUUZM3NmK-pKiw  
  * \[TELNYX\] \[Telnyx \-\> Retell\] Failed to start AI agent recording … "Call not answered yet"  
  * **Race condition – \#0**  
  * **Push change for alerting on duration \= 0 \#0.5**  
  * **PR: [8637](https://github.com/cybernetic-ai/blackbird/pull/8637) solves the two issues above**  
* Ongoing:  
  * **1\. Custom file naming**  
    * **Build** some good way of backfilling for future  
    * [**README.md**](http://README.md) **describing stuff now**  
  * **2\. Audit**  
  * Surfacing transcript and recording for post\_transfer  
    * Put it in zookeeper  
    * Phone \# across all tenants, transcript, post transfer transcript, post transfer mp3, not only thru gcs  
    * 3 \- 4 wks back – `as of jan 1st, 2026`  
    * Wrap up earlier then worry about backfilling after  
      * Future population of data  
  * **3\. Think more here** Implement remapping non\_leads to leads \+ go both ways? **Yes, separate PR**  
    * Ipc NON\_LEAD transfer LEAD \= LEAD  
    * Ipc LEAD transfer NON\_LEAD \= NON\_LEAD – could be iffy, do it and see how it looks  
    * **Do this on Hex dash**  
  * Remove non lead, non live escalation 4th level? **Yes, separate PR DEPENDENT ON ABOVE**   
    * Have convo with some people abt it  
  * Mat view update **kinda really important now that i backfilled like 30% of all transferred calls in the last 7d**  
  * Make sure IPC transfer\_duration is getting filled on transfer-call-ended (+ run backfill)  
  * Move analytics.{task, classification} to process-call-ended on temporal  
    * text stays on CRON, dont change the cron since it wont fully depend on process call ended never erroring  
  * Figure out how to handle immediate transfers both in recording and analytics  
    * Linear ticket?

## Dec 12, 2025

* Pushed new fix  
  * Noticed much better data  
  * Still a hand full of nulls, will look into it  
* Try backfilling the calls via GCS files  
  * **Build** some good way of backfilling for future  
  * Script somewhere  
  * **Send brief update to Certus people (alan, davin)**  
* Ongoing:  
  * Run backfill on intent classifiers \+ mat view update **kinda really important now that i backfilled like 30% of all transferred calls in the last 7d 😛**  
  * **Look at new data and make sure it makes sense**  
  * Implement remapping non\_leads to leads \+ go both ways? **Yes, separate PR**  
    * Ipc NON\_LEAD transfer LEAD \= LEAD  
    * Ipc LEAD transfer NON\_LEAD \= NON\_LEAD – could be iffy, do it and see how it looks  
    * **Do this on Hex dash**  
  * Remove non lead, non live escalation 4th level? **Yes, separate PR DEPENDENT ON ABOVE**   
    * Have convo with some people abt it  
  * Make sure IPC transfer\_duration is getting filled on transfer-call-ended (+ run backfill)  
  * Move analytics.{task, classification} to process-call-ended on temporal  
    * text stays on CRON, dont change the cron since it wont fully depend on process call ended never erroring  
  * Custom file naming for recordings  
  * Figure out how to handle immediate transfers both in recording and analytics  
    * Linear ticket?  
* EnergyAid  
  * Sync \+ tutorial  
  * Salesforce CRM  
    ![][image14]  
* Feedback

## Dec 11, 2025

* Merged in PR with change  
* Backfilled all affected calls  
* Telnyx recording url not getting filled, investigate why  
  * **Start with this**  
* Ongoing:  
  * Run backfill on intent classifiers \+ mat view update **kinda really important now that i backfilled like 30% of all transferred calls in the last 7d 😛**  
  * **Look at new data and make sure it makes sense**  
  * Implement remapping non\_leads to leads \+ go both ways? **Yes, separate PR**  
    * Ipc NON\_LEAD transfer LEAD \= LEAD  
    * Ipc LEAD transfer NON\_LEAD \= NON\_LEAD – could be iffy, do it and see how it looks  
    * **Do this on Hex dash**  
  * Remove non lead, non live escalation 4th level? **Yes, separate PR DEPENDENT ON ABOVE**   
    * Have convo with some people abt it  
  * Make sure IPC transfer\_duration is getting filled on transfer-call-ended (+ run backfill)  
  * Move analytics.{task, classification} to process-call-ended on temporal  
    * text stays on CRON, dont change the cron since it wont fully depend on process call ended never erroring  
  * Figure out how to handle immediate transfers both in recording and analytics  
    * Linear ticket?

## Dec 10, 2025

* Faced big data issue :/ recordings were being overwritten  
* TLDR:   
  * `Problem: When calls are transferred, two recordings are created: an AI agent recording (telnyx_recording_url) and a transfer recording (transfer_recording_url). The webhook handler used call.status === "transferred" to route recordings, but if the AI agent recording webhook arrived after the call status was already set to "transferred" (race condition), it would be incorrectly routed to the transfer workflow and stored in transfer_recording_url. When the actual transfer recording webhook arrived, it would overwrite this field, but the post_transfer_diarization_url had already been created using the wrong recording (AI agent instead of human), causing transcript/recording URL mismatches in analytics.`  
  * `Solution: Implemented a state machine using a new recording_status column that explicitly tracks recording lifecycle (NULL → recording_agent → recording_agent_received → transfer_recording_received). The status is set when recording starts and transitions as webhooks arrive, eliminating timing-based logic. Added idempotency checks to prevent duplicate webhook processing and a URL comparison check to detect and ignore duplicate AI agent recording webhooks that could be misrouted to the transfer workflow. Also fixed an ordering bug where orderBy("created_at", "asc") was incorrectly fetching the oldest call instead of the most recent.`  
  * Ran backfill script (re-diarize, overwrite in ipc table, rerun full transfer-call-ended workflow incl. event detection, classification, etc.)  
  * PR for fix [8469](https://github.com/cybernetic-ai/blackbird/pull/8469) migration for state machine and [8470](https://github.com/cybernetic-ai/blackbird/pull/8470) for logic fixes (**8470 errors bc it depends on 8469 migration**)  
    * **Can you pass in metadata for the recording? Using this instead of state\_machine would be much better**  
    * **YES\!\! Way better, closing out 8469 and 8470**  
* Found another issue with the changes to intent classifier → need to update enums due to fkey req.  
  * PR [8468](https://github.com/cybernetic-ai/blackbird/pull/8468) (merged so i could run data backfill)  
  * **OUTSTANDING SEMANTIC Issue with PERMITS\_CERTS\_GOV\_INSPECTIONS** [Albert Yue](mailto:albert@netic.ai)**:**  
  * The enum table can only have ONE entry for PERMITS\_CERTS\_GOV\_INSPECTIONS (PRIMARY KEY on value), but the classifiers use it in TWO different intents:  
  * NewAppointmentSubtype.PermitsCertsGovInspections (line 29 in intent.ts)  
  * GeneralInquirySubtype.PermitsCertsGovInspections (line 53 in intent.ts)  
  * Originally in enum: ('PERMITS\_CERTS\_GOV\_INSPECTIONS', 'ADMIN\_INQUIRY'), classifiers now use it for: NEW\_APPOINTMENT and GENERAL\_BUSINESS\_INQUIRY  
  * Not used in ADMIN\_INQUIRY anymore  
  * If we keep it as ADMIN\_INQUIRY:  
  * FK constraint: ✅ Works (only checks value exists)  
  * Semantics: ❌ Wrong (enum says ADMIN\_INQUIRY but code stores NEW\_APPOINTMENT or GENERAL\_BUSINESS\_INQUIRY)  
  * Data integrity: ⚠️ Tasks could have intent='NEW\_APPOINTMENT', sub\_intent='PERMITS\_CERTS\_GOV\_INSPECTIONS' even though enum says it belongs to ADMIN\_INQUIRY  
* Ongoing:  
  * Run backfill on intent classifiers \+ mat view update **kinda really important now that i backfilled like 30% of all transferred calls in the last 7d 😛**  
  * **Look at new data and make sure it makes sense**  
  * Implement remapping non\_leads to leads? **Yes, separate PR**  
  * Remove non lead, non live escalation 4th level? **Yes, separate PR**  
  * Make sure IPC transfer\_duration is getting filled on transfer-call-ended (+ run backfill)  
  * Move analytics.{task, classification} to process-call-ended on temporal  
    * text stays on CRON  
  * Figure out how to handle immediate transfers both in recording and analytics  
    * Linear ticket?

## Dec 9, 2025

* Get frontend over the finish line (PR: [8414](https://github.com/cybernetic-ai/blackbird/pull/8414))  
  * Q: Kysely doesn’t recognize mat views, how to fix error :( ? Fixed yay  
  * PR fixes are out  
* Get data sign off from team  
* Ongoing:  
  * Make cron for refreshing mat view `post_transfer_interactions_reason` in Temporal  
    * PR: [8461](https://github.com/cybernetic-ai/blackbird/pull/8461)  
  * Look into STL hoffmann “Interrupted” data  
    *   
  * Run backfill on intent classifiers \+ mat view update  
  * Implement remapping non\_leads to leads? **Yes, separate PR**  
  * Remove non lead, non live escalation 4th level? **Yes, separate PR**  
  * Make sure IPC transfer\_duration is getting filled on transfer-call-ended  
* Have to do some work on my finals tonight so trying to get this over the finish line soon

## Dec 8, 2025

* Assumptions & decisions made in `post_interactions_reason` mat view  
  * Lead non lead mapping  
    * If booking\_unresolved\_outcome \= JOB\_NOT\_READY or INFO\_ONLY\_NO\_INTENT\_TO\_BOOK then NON\_LEAD  
  * Category mapping  
    * If booking\_unresolved\_outcome \= JOB\_NOT\_READY or INFO\_ONLY\_NO\_INTENT\_TO\_BOOK then UNBOOKED → HANDLED  
  * Reason mapping  
    * Moved negative sentiment mapping further down the unbooked reasoning (its not very descriptive)  
  * Sub-reason mapping  
    * Moved negative sentiment mapping further down the unbooked reasoning (its not very descriptive)  
  * Getting this PR in for mat view: [8374](https://github.com/cybernetic-ai/blackbird/pull/8374)  
* Finish frontend changes and push in[https://github.com/cybernetic-ai/blackbird/pull/8374](https://github.com/cybernetic-ai/blackbird/pull/8374)  
  * Feature flag? What should we do here before the data is signed off?  
  * I didn’t hear anything from anyone  
  * Put it in the post\_transfer\_outcomes feature flag **under use new classifiers**  
  * May need to feature flag on top  
* Hex dash changes  
  * Make same date range, more apples to apples  
  * **Look into STL hoffmann data**  
    * **Run GPT pipeline to get summaries \- Slack albert with info from this**  
* **Next project:** EnergyAid analytics  
  * Talk to albert but mostly teddy and emma who have best understanding  
  * Ad hoc for now then generalize later  
  * Fit it into generalized version of existing pipeline?

* Tangible plan:  
- [x] ~~Finish mat view~~  
- [x] ~~Merge in & migrate DB~~  
- [ ] Make frontend changes PR (look at setup for hoffmann, remapping initial leads too)  
- [ ] Make temporal sync function  
- [ ] Look into hoffmann data with GPT summary function  
- [ ] Calculate \# minutes transcribed per hour, day, week, month for post transfer workflows for Zi  
      - [ ] Added new column to IPC   
      - [ ] Update on post\_transfer\_diarization\_url

## Dec 5, 2025

* Analytics msg with data for review  
  * Hex dash looking good  
  * Should I bump Alan and someone else to review and sign off on the data?  
  * Alan to look on the plane  
  * See if Emma or Brandy has some free time  
* TY for PR fix  
* Ongoing:  
  * Frontend \+ materialized view  
    * Look at existing mat view for general prioritization  
    * Prefer timing as opposed to call back  
    * Put it at the end?  
      * **Make a little table of assumptions with prioritization and then send to Albert**  
  * Just start working on this, not worry about it  
  * NON\_LEAD → LEAD mapping question?  
  * Reclassify the whole call as a lead? \*\* not commit to anything yet  
    * See how much reclassification happens  
    * How much does that move things?  
    * **Add something in Hex dash**  
* Finished up some QA dash stuff for DC \+ one more PR for that coming out soon  
* Have a final project due at midnight tonight so some of the misc. work may bleed into the weekend – will try to prevent it as much as I can

## Dec 4, 2025

* Updated classifiers  
  * PR [8258](https://github.com/cybernetic-ai/blackbird/pull/8258) merged in  
  * Backfilled \~300 calls that were `Appointment Book` type `Other` so we have up to date info  
  * Changes are viewable in Hex dash  
    * Looks MUCH better, also not much of Booking Unconfirmed in the large scale of things  
* Pending  
  * Fix copy (there's a couple remaps that could be better worded)  
  * Sign off from team  
  * Make materialized view  
  * Rip the frontend changes  
* **High level updates for when pushing things in \#analytics**, **timeline**  
  * Data audit with spreadsheet  
  * Set up hex dash so you can listen to the post-call itself  
  * Put into pound analytics  
  * **Write in timeline, land on Monday given that the data has been signed off**  
* Need to do QA dash stuff today for a little

## Dec 3, 2025

* Classifiers implemented, looks better

  ![][image15]

  * Decreased OTHER from 181 → 10 (combination across all tenants)  
  * List of interaction id that got called as resolved: [Booked Interactions w/o Mechanical Trace](https://docs.google.com/spreadsheets/d/1lWDxex-ruGlTfEJEonYj5VyDSD-C0PvajhtiG-f3aik/edit?gid=2119777249#gid=2119777249)  
  * Pending PR for the production version of new classifiers, will send after some testing  
  * Will run backfill on all classifiers with `APPOINTMENT_BOOK` but no other objections  
    * **Backfill by sept 12th – post transfer stuff**  
  * Then frontend changes, sync with   
    * **Build similar views?** Have some kind of materialized view so its faster to query the data, on the order of 15 mins, also refreshed by classifiers running  
      * Run every min should be fine  
* Solution is as below  
* Looked at AI listening issues for Zi  
* Have some outstanding QA dash asks from DC that will work on after  
* Start thinking about eval set and compiling that  
  * Make it very easy to add to a dataset  
  * “Hey this is misclassified → auto saves here”

## Dec 2, 2025

* Worked on classifiers some more  
  * Went through Hex dash  
  * Hex SQL queries look good, still have a lot of unbooked other  
  * Added back booked live, booked later, etc. see hex dash for details. Looks better but still too many unbooked others  
  * Trying out new `BookingObjection` classifier to capture these unbooked others  
    * Has things like:

      "PAYMENT\_METHOD\_REQUIRED", **in ServiceObjection? Risk hallucination if we know it should be 0%**

      "CALL\_DISCONNECTED",  → currently mapped to Other

      "ALTERNATIVE\_SOLUTION\_CHOSEN",

      "APPOINTMENT\_ALREADY\_EXISTS", → eventually remap to `NOT_LEAD` and not unbooked

      “PARTS\_FULFILLMENT” → look into this

      "SCHEDULING\_CONSTRAINTS",

      “OTHER\_OBJECTION”,

      "NO\_OBJECTION",

  * Add `PaymentMethodRequired` to ServiceObjection, eg.  
  * Outside service area, unsupported job type, get remapped to not lead  
    * Move them here?  
  * **Run for post transfer calls**  
    * **Q: just run on calls that are trying to be booked?**  
    * **Probably fine to run it just on appointment\_book subintent**  
    * **ONLY FOR post transfers**  
  * Will be trying to use GPT to figure out why it unbooked or if it sounds like they actually booked for quicker turn around  
  * Also going to improve the `CompetitorObjection` classifier, the initial prompt is not very clear and may not be capturing `DIYSolve` and other objections well  
* Rerunning this later today  
  * Upload to hex via spreadsheet

## Dec 1, 2025

* Sync to figure out what has changed, what still needs to be done  
* Outstanding PR: [7864](https://github.com/cybernetic-ai/blackbird/pull/7864) for our own recordings via telnyx instead of livekit  
  * Should I bump Zi or Daniel for this?  
* Status on classifiers?  
  * Include booked later in the hex dash  
  * Look at SQL to check WHYY  
  * \<15% other target, if we have gone through this multiple times, just move on  
  * Cycle 1-2x in improving the numbers, but dont spend too long  
  * Question for DC: do we think QA can help suggest new categorizations?  
  * Read/listen to a couple, check the \# that would get activated  
  * Maybe GPT suggests new categories?  
* Roll out  
  * Sync with Osmond, should be fairly straightforward  
  * Show them calls somewhere? Hub? Collapsible for a post transfer call? Handle without having it  
* Run script to have telnyx recordings correctly saving  
* Fly up next week?  
  * Talk with melisa to see  
* Next thing, probably multi fsm or onboarding/ROI metrics  
  * How much has netic impacted their business?  
  * Ad hoc to start, then later on probably a dashboard  
  * Stay ad hoc for quite a while

## Nov 24, 2025 \- Nov 28, 2025 OOO for Thanksgiving

## Nov 21, 2025

* Hawk N-1 blended booking rate stats  
  * Get QA’able set of calls, need to use ST for this  
  * Track whether it sounds like it was booked or not booked  
  * What kind of booking (job type, etc.) was it  
  * Why did it go unbooked?  
  * [Albert Yue](mailto:albert@cyberneticlabs.ai) to send hex dash with info  
  * Get 100, one for every subreason at least  
    * **Have QA’s on it here, look at Albert tab: [\[INTERNAL\] Audit Post Transfer Calls](https://docs.google.com/spreadsheets/d/1gAC0YXtE-8S1T6t-2rj_br-VYjlXJQiY8tR0iVb0x_s/edit?gid=1906804167#gid=1906804167)**  
* Helped RR team yesterday  
  * Helped set up alerting pipeline using ST calls  
  * Still need to work on a PR for our own internal telnyx recordings, WIP  
* Had QA look at the calls to figure out what's wrong with the classifiers  
  * Findings: classifiers were accurate in intent, just need some tweaking in `ServiceObjection` and rethink a little  
  * Added info to my column here: [\[INTERNAL\] Audit Post Transfer Calls](https://docs.google.com/spreadsheets/d/1gAC0YXtE-8S1T6t-2rj_br-VYjlXJQiY8tR0iVb0x_s/edit?gid=174195845#gid=174195845)  
* New Idea for classifiers:  
  * Have AppointmentBook run new classifier after it to figure out why something may not have booked, will have to think about a better way to do this  
    * Run third step of Resolved vs Unresolved  
    * Add more information to service objection  
    * ^the above only for post transfer classification  
* Draft PR with scripts and everything in case we need to

## Nov 20, 2025

* Set up `telnyx_integration` table  
  * **WIP**  
  * Wanna make this actually good, there's a way to GET the storage setup for voice apps so if we can have a checker that would be great  
    * [https://developers.telnyx.com/api/call-recordings/get-custom-storage-credentials](https://developers.telnyx.com/api/call-recordings/get-custom-storage-credentials)  
* Helping set up alerting and monitoring for [Zi Gao](mailto:zi@netic.ai)  
  * Context from Alan: `The Roadrunner team is SUPER stretched right now and I was wondering if you could combine the work you are doing on transcriptions / calls with alerts to help building alerting / detection for this.`  
* Regarding classifiers, they are looking fine other than `APPOINTMENT_BOOK` stuff  
  * Thinking about how to mask this for frontend stuff in case we cant mechanically confirm booking, **any thoughts here?**  
  * Other  
* SQL APPOINTMENT\_BOOK  
* **Tangible next steps:**  
  * Pull some data unbooked\_other  
  * Get actual event – did human answer, get post\_interaction job existence, get classifier results  
  * Start with wilson tenant  
* Any scripts or things to look at the data, put these in a branch

## Nov 19, 2025

* Classifiers  
  * Take a look at wilson booked numbers  
  * Need to speak with landlord, no authority to book, outside service area, not supported job or trade \-\> remap to handled  
  * Price shopping \-\> remap to handled  
  * Look at view `interactions_reason`  
    * **All remaps should be considered as of rn similar to interactions\_reason build**  
  * Add view that looks at unbooked reason, sub reason to Hex dash  
    * **Added\!**  
  * Listen to some Wilson calls to find out why so many unbooked  
    * **Classifiers unbooked tab in** [\[INTERNAL\] Audit Post Transfer Calls](https://docs.google.com/spreadsheets/d/1gAC0YXtE-8S1T6t-2rj_br-VYjlXJQiY8tR0iVb0x_s/edit?gid=174195845#gid=174195845)  
* Hold off on PR for new event detection in case we need to change any classifiers  
  * Finding: classifiers auto classify `APPOINTMENT_BOOK` intent as `UNRESOLVED`   
  * [PR 7745](https://github.com/cybernetic-ai/blackbird/pull/7745)  
  * Will merge in tonight and run backfill\!\!\! yay

## Nov 18, 2025

* Continue working on classifier changes from audit below, especially event detection issues 1\) and 2\)  
  * Made changes here to 1 and 2 but it did not get great results, working on it some more today  
  * Will have PR out by tn PR   
* Then work on Hex dashboard for internal showing of this  
* Helping Inaki with QA/eval stuff

## Nov 17, 2025

* Continue working on classifier changes from audit below, especially event detection issues 1\) and 2\)  
* ~~Look into IPC deduplication from webhooks sent by telnyx~~  
  * ~~This was triggering transfer loop detection~~  
  * Albert will take this  
* Classifier, negative sentiment classification matters the most  
* Add a flag to not run post transfer stuff on Certus / EnergyAid  
* Add PR for backfill script in `scripts/recovery`

## Nov 14, 2025

* Audit was complete by QA: [\[INTERNAL\] Audit Post Transfer Calls](https://docs.google.com/spreadsheets/d/1gAC0YXtE-8S1T6t-2rj_br-VYjlXJQiY8tR0iVb0x_s/edit?gid=0#gid=0)  
* How can we prevent tenants switching to Telnyx and not being set up to upload transfer recordings to GCS?  
  * Reactive: alerting on call transferred not having a transfer\_recording\_url after X min(s)  
  * Preventative: on tenant config?  
* **Frontend changes:**  
  * Have a product talk  
  * Add info button next to the generic reason in the table   
    * “Hey this is only available after X date because of tracking reasons”  
  * Get data to inform what we expect for remapping non-leads \-\> leads  
* After reviewing classifiers:  
  * Transfer loops are messing everything up, [fix \#7625](https://github.com/cybernetic-ai/blackbird/pull/7625)  
  * Event detection issues:  
    * 1\) speaker-based search prepending phrases from other speakers,   
    * 2\) transcript-based search being too sensitive,   
    * 3\) human section not writing to DB (unclear why): [fix \#7630](https://github.com/cybernetic-ai/blackbird/pull/7630)  
  * Classifier issues: minor issues with themselves but the major issue is running CustomerSentiment on no response from customer, and running them on voicemail

## Nov 13, 2025

* Classifiers are IN  
* Backfilled 92 calls from yesterday  
* Audit:   
  * Cut a subset of calls to audit before pushing frontend changes  
  * Do it on hex dash  
* **Will work on frontend changes**  
* **Todo:**  
  * Figure out way to run backfills  
  * Turn temporal erroring back on for handleTransferCallEnded  
* Noticed we still have a lot of tenants on twilio, can we switch to telnyx?

## Nov 12, 2025

* Event logging PR is in  
* Getting classifiers PR in now  
* Will begin work on frontend changes

## Nov 11, 2025

* In person LETS GO SO HUGE ABSOLUTE W\!  
* Audit was complete, looks pretty good, minor adjustments to classifiers themselves  
  * Note: event logging voicemail definition could be improved (consider IVR?)  
* Plan for today:  
  * **Get the event logging PR in**, reviewing ur comments rn  
  * Run Blanton’s (name \= Katrina) audit pull, gonna have to figure out how to do event logging here since its technically not post-transfer  
  * **Get classifiers PR in**  
  * Review Michael’s code to unblock  
  * **Fix terrible Telnyx call recording naming**  
    * Changing naming is more for when u are searching in GCS  
* Send lakes examples to albert **done**  
* Feature flag under Blanton’s  
  * Classifiers run: make sure no AI frustration stuff  
  * Backfill to spot check  
  * How are they going to be able to listen to the call? Link to ST or just show our portion of the recording? [Osmond Wu](mailto:osmond@cyberneticlabs.ai)  
    * Osmond is working on it  
  * On dashboard?  
  * **Own frontend change**

## Nov 10, 2025

* Worked on integrating classifiers into pipeline   
* Spending all day auditing results, will copy paste sheets here:  
  * Sheet for event\_log & classifier auditing: [post\_transfer\_audit](https://docs.google.com/spreadsheets/d/1kR3HnKbATzrDpXB3LbEvgEGT8_phQ67WGJ1Iwe9aaxw/edit?gid=0#gid=0)  
  * Can pull data from DB for mechanical solutions  
  * job\_interaction\_map and netic\_st\_call\_map  
* Aiming for \~30 each  
* Other than that, lmk if u can review [PR 7345](https://github.com/cybernetic-ai/blackbird/pull/7345)  
* Blanton’s  
  * Agent name \= Katrina, go thru API  
  * Pull \~30 ish, inbound call  
* Ongoing:  
  * Fix the way we store post transfer recordings (named weirdly by default)  
  * Backfill function  
  * Frontend changes as well

## Nov 7, 2025

* Made classifier tables  
* Make classifiers run and write to DB PR incoming today  
* Also tested audio-splicing and end-to-end functionality, had to make a few changes but then it worked well\!   
  * Notably, changes to packages for temporal workers  
  * Updated [PR 7345](https://github.com/cybernetic-ai/blackbird/pull/7345)  
  * **Deploying temporal**  
    * **Just pray 🙏**  
    * **Run it at *about* the same time**  
    * **pnpm deploy in prod, .env.local \-\> dev secrets**  
* Ongoing:  
  * Audit  
    * Audit the classifiers with a spreadsheet, do \~20 to make sure that they look sane  
    * Audit event\_logging given multiple human speakers  
  * Backfill function  
    * weird problem to connect call recording \<--\> ipc id  
      * Look into simlinks or just move the files and rename  
    * The way telnyx saves calls is really ugly

## Nov 6, 2025

* Confirmed Temporal worked finally  
* Working on changes to DB that will allow classifications to be stored  
  * Pretty big changes though so was wondering if i should do it in separate PR  
  * High-level:   
    * Right now, classification table is keyed on customer\_interaction, which prevents one customer interaction from having two of the same classifications  
    * I believe it should be keyed on task as well as customer interaction, since 1 customer interaction \-\> many tasks and 1 task \-\> many classifications  
    * This would change the views that use classification and also the way we upload so I would have to make those changes as well  
      * **What is intent\_initiator for analytics.task? Could i use this to say its “post-transfer”, rn it only has customer in it**  
      * **I would then add column to classification “task\_id”**  
      * **Change views to not consider classifications where task\_id.intent\_initiator \= “post-transfer” or whatever we decide here**  
      * **Task and classifiers actually run in parallel**  
    * **Make new tables\!\!** [PR 7372](https://github.com/cybernetic-ai/blackbird/pull/7372)  
    * In the mean time tho we can have event logging running and I can backfill classifiers off of the human\_section table  
* Still to-do for post-transfer:  
  * Confirm that audio splicing works   
  * Run an audit on the event logging portion  
  * Test a few end-to-end runs with phone calls  
  * BACKFILL function that pulls previous recordings  
    * Make this a temporal function to cross check each day  
* THEN:  
  * Classifiers stuff yay\!  
  * Audit \+ write to DB  
* Intent:  
  * Post transfer and pre transfer should have same intent (most of the time)  
  * When they differ, why is that?  
  * Can we use the post-transfer intent to better classify the Netic analytics?  
  * True \# of leads that we transfer

## Nov 5, 2025

* Tested onTransferCallEnded(), everything worked in terms of diarizing (only if needed, it checks GCS first), event extraction, write events to DB, human section write to DB, etc. etc.  
* Still missing: need to test the temporal functionality and the classifier write to DB  
  * Can do separate table or add column to customer\_interaction  
  * Meeting with Jessica and Zi to sort these two out  
  * Then sending out PR  
* Backfilling function in progress as well  
* Todo:  
  * Write to classifier:  
    * Change flattened interaction view so it ignores any post transfer  
    * Look at adding new column to interaction table  
  * Audit the classifiers with a spreadsheet, do \~20 to make sure that they look sane  
  * Temporal stuff

## Nov 4, 2025

* Before I forget: will be OOO the week of Nov 24th \- 28th, had previously discussed with Melisa so should be all good–submitted on Rippling too. Will only be available for true true emergencies since im travelling with family  
* Twilio transfer call still not working :( can look into it more though (im able to have it transfer and ive tried a couple ways to record but im not getting a webhook back)  
* **How does prettier lint work? Want to make sure my functions abide by that**  
* Plan for today, finish the following:  
  * onTranserCallEnded() temporal function ✅  
    * Diarization ✅  
    * Diarization write to GCS ✅  
    * Event extraction ✅  
    * Event extraction modification for multiple human speakers (WIP)  
    * Event write to DB (both raw log and human\_section) ✅  
    * Classifier run ✅  
    * Classifier write to DB (talking with Zi)  
  * Test the above a few times^  
  * Work on a backfill function  
* Ongoing items:  
  * Test on Blanton’s data with multiple speakers  
  * Revisit Twilio recording integration  
  * Make backfill function into Temporal function that runs every 24h to collect the calls that transferred but were somehow missed  
  * Make call\_event\_log\_view and call\_event\_log

## Nov 3, 2025

* Talk about Blanton’s post-Netic transfer call  
  * How are they doing recording and storage?   
    * When CXR \# is hit, call recording is initialized  
    * ST has different fields for picked up vs. voicemail (?)  
    * ^if true, could be used to see if human detection is working  
  * How should we change classification given multiple humans potentially?  
    * My thoughts: use current setup but consider HOLD \-\> *between transfer hold*  
    * Note for diarization: multiple speakers could be humans → **\#todo** figure out how to pick the earliest occurrence of human speaker, not just any human speaker  
      * Pull some data from Blanton’s \- we know at least 1 exists there in oct 6th  
      * Person is named: Katrina  
      * If agent name is katrina, prob two humans  
* Sending out the following PRs today:  
  * Twilio call recordings (need to do a bit more testing but should be good) **WIP**  
  * Init tenant changes for telnyx [PR 7233](https://github.com/cybernetic-ai/blackbird/pull/7233/files)  
  * DB phase 1 schema migrations  
    * [PR 7237](https://github.com/cybernetic-ai/blackbird/pull/7237)  
* Ongoing:  
  * onTransferCallEnded()  
  * Temporal stuff for the above  
  * Testing

## Oct 31, 2025

* Storage items to-do  
  * Make sure its in the init-tenant script or at least done when we add a new tenant  
  * Ask albert best way to do this if i need the connection id in order to run the script  
  * **Do it in init tenant, add new field to .txt file**  
* Note: for some reason mister sparky transferred calls aren’t showing up on telnyx, do they not use telnyx?  
  * **They use twilio, ask in party if we should support twilio**  
  * **Do research if its easy/what it would entail**   
* For migration  
  * Either approach is fine  
* Working on writing to gcs and running in temporal  
* Will prob need to adjust timeline

## Oct 30, 2025

- WIP: Switched over Telnyx recordings to GCS bucket  
  - Getting some weird error when Telnyx tries to hit it, been debugging for 2+ hrs but cannot figure it out  
  - Will move on to other ongoing items and revisit the Telnyx custom storage later  
- **WORKS\!\!\!\!**  
  - Apply to all tenants **DONE\!**  
  - Add the script to init-tenant WIP  
- Working on ongoing items on the side

## Oct 29, 2025

- Discuss db schema again  
- WIP: Switched over Telnyx recordings to GCS bucket  
- Ongoing:  
  - Make tables and integrate checkpointing (both DB \+ GCS storage) into pipeline  
  - Make sure classifier run is being stored in DB appropriately  
  - Testing ^  
  - Temporal function to run pipeline onTransferredCallEnded  
  - Temporal function to confirm all transferred calls in the last \~24hrs have recordings AND have been event logged \+ classified–if some calls are outstanding, run pipeline for those  
- Completed:  
  - Finalized pipeline core functionality (see example run below)

![][image16]

## Oct 28, 2025

- Present DB Schema  
- Need to switch over Telnyx recordings to a diff bucket (not their own S3)  
  - Will do Telnyx, need to sync w/ zi or daniel about this  
- Pipeline is WIP  
- Discuss next steps after this is running for transferred Netic calls?

## Oct 27, 2025

- Test in integration env  
- Ship and test for all tenants **shipped** ✅  
  - Have a check “we transferred but no recording or very little time \<Xs etc.”  
- Temporal function similar to process call ended **if trigger** is reliable  
  - Check if trigger is reliable  
  - Have a check or CRON that makes sure this ran for every call we expected to run: if not, alert and/or rerun for those calls  
- Present DB schema tomorrow

## Oct 24, 2025

- Testing the two different ways to have voice recordings through Telnyx locally  
- Using friends phone to emulate transfer  
- Roadrunner was hard to set up :(

## Oct 23, 2025

- Setting up Roadrunner for local testing  
- Talked with Daniel \+ Zi to figure out best way to do call recordings, and worked on setting up Roadrunner  
- In the mean time, productionize existing script for event\_logging (using ServiceTitan calls)

## Oct 22, 2025

Thomaz notes:

- Talked to Zi about exploring call recordings with Twilio \+ Telnyx  
- TLDR we can’t currently natively do it, but there is a way to do this  
  - For Twilio:  
    - When we transfer, we transfer with a PSTN leg  
    - We should be able to keep listening in as long as ST doesn’t issue a REFER transfer  
    - If they do, then we would need to introduce the idea of “conferences” (basically rooms like livekit) where we add and remove speakers but maintain continuous recording  
  - For Telnyx:  
    - We are currently transferring while maintaining B2BUA (back-to-back user agent)  
    - This means the original caller (A-leg) is kept alive but the other slot (B-leg) is replaced with the transferPhoneNumber  
    - We should be able to do dual-channel recordings pretty easily *after* the transfer  
    - If ST issues a REFER we would also need to do conference-as-a-switchboard approach but this should only happen if we need to transfer to SIP URI  
- Questions:  
  - **How can I test transfers locally? Do we have a script for this?**  
  - **What’s the split between Telnyx/Twilio rn? I want to test these audio recordings but want to know what i have to split between**  
    - Pros of this approach: we could get high quality, dual-channel recordings once we KNOW we have transferred  
    - This renders a lot of my prev research useless for the future (rip, except yay for backfills) BUT gives us extremely high quality data to work off of which is awesome  
    - Question is we need to stitch back together recording → inbound phone call still to attribute the transfer but this can be solved  
  - **Thoughts?**  
- 

## Oct 21, 2025

Next Steps:

* Need to finalize DB schema  
* Exploring call recordings on Twilio \+ Telnyx would be huge  
  * Talk to daniel about this  
* Production Call Recordings. 

Thomaz notes:

- See sheet here: [st\_call\_id EDA](https://docs.google.com/spreadsheets/d/1XV1COK8FUlMdoS1wCCvMeEgDrLd_C1iw7E5E4-VtMJo/edit?gid=2030511239#gid=2030511239)  
  - Some netic calls don’t show up in service titan, could they be calling the agent directly? Typically happens when customer makes more than one call within the same day  
- Productionizing scripts into bbird

## Oct 20, 2025

Thomaz async updates:

- Working on ServiceTitan call id mapping to inbound phone call id, looking at some examples to get a feel for what cases exist for Hawk (will have spreadsheet with findings and solutions)  
- Meanwhile productionizing pipeline in blackbird in \`lib/st-call-analytics\` or smth  
  - Refactoring from my python research files to typescript

Still to do:

- Need to finalize DB schema  
- Productionize pulling call recordings from ST (dependent on ST API)  
- Future: event logging for voice mail, classifiers (when price objection)?

Goal: productionized pipeline of call \--\> event logging \--\> classifiers by EOW

## Oct 17, 2025

Next Steps:

1. Splice audio for human agent section (between human agent start and voicemail OR end of call)  
2. Run through classifiers  
3. Upload to a sheet for audit

**THEN**

4. Productionize pipeline  
   5. Questions:   
   6. where should I save transcript splices? GCS or a DB column?  
      1. Transcripts: either one is fine for now, if easier store in DB for now  
      2. Store audio online  
      3. If row size \< 1mb then ur good  
   7. Need to finalize DB schema  
   8. **Need to fix the mapping of ST id to inbound\_phone\_call table**  
      1. **Start looking into it – run mapping on larger set of data and go through why failing (no need to run diarization or classification)**  
   9. Need to productionize function of pulling all service titan calls and storing in GCS  
      1. Can i make these API calls rn? Will be on the order of 100,000s to backfill just Hawk for a few months  
         1. **Send script**  
10. Implement the voicemail event logging  
   11. Either after netic call or after human agent  
12. Look into implementing event logging for classifiers

## Oct 16, 2025

**Async Update:**  
Called with Zi yesterday regarding classifiers stuff, started adjusting the pipeline to run it for the Service Titan human agent call snippets. Will hopefully have classifier results for the 99 calls from yesterday by tonight. I can share the results with you and audit a few calls myself as well.  
Also cool idea that came out of the convo with Zi yesterday:

* We could add snippets on the calls of where we see price shopping, price objection, etc.  
* These would be new “Events” in the event logging but identified from classifiers (ex: we saw price shopping at 1:53)  
* Could be used as a marketing tool to show customers how granular our data is?  
* What are ur thoughts? This could also have positive affects in the accuracy of our classifiers since it would enforce the llm to have rationale as to where it saw price shopping, etc.

**IDEA THAT CAME FROM MEETING WITH ZI:**

* **Add snippets to calls of where we see price shopping, price objection, etc.**   
* **“Events” from classifiers**  
* **Could be used as a marketing tool to show customers where we get our data from. [Alan Yu](mailto:alan@cyberneticlabs.ai) thoughts?**

**![][image17]**

## Oct 15, 2025

Looking at data (100 calls) with Alan:

- Events look mostly correct within 5 seconds, look at trimming this down  
- **Problem we need to solve before production: inbound\_phone\_call to service\_titan\_call\_id is incorrect some times**  
  - **If it doesn’t transfer, its not guaranteed to have one**  
  - **Calling directly doesn’t go through service titan UNLESS we transfer**  
    - **Start time might by at the end of the netic call**  
  - **Could filter by customer ID as well or phone number as well**  
- Start working on classifier  
  - Lead vs non lead between calls  
- What is happening right after requested human call?  
  - If all are non leads after we transfer, we learn a lot  
- **Add hit voicemail**  
- Eventually improve the evals system for analytics classifiers

Meeting with Zi:

* Setting up classifiers for service titan call portions  
* Good call out: for **Booked** classification, we check ipc table for has\_job\_id or is\_emergency\_notified  
  * Confirm if ipc.data \-\>\> jobId pulls from Service Titan or not and if this may double count  
  * Don’t double count if it exists in ipc.jobId – Zi doesn’t believe ipc table gets updated

## Oct 14, 2025

Thomaz:

* Notice: need to improve the matching inbound\_phone\_call to service\_titan\_call\_id, some calls (like call id: 00011946-def2-4184-a191-b96676a9549b) has the incorrect st call id tagged to it

Next steps, solve for:

* Did we transfer and have an agent pick up?   
  * Join our live transfers on to the call data essentially.   
    * Assumption is:   
      * If there is a hold mis but not an agent pick up \=\> not picked up  
        * Sanity check the call length is longer than the “hold”  
      * If there is an agent, it must have been picked up?   
    * Two interesting questions:   
      * How long is the average transfer hold? Is it like 15 seconds or is it like 1 minute.   
      * How often do people drop off? For people who drop off, do they drop off at like 1 minute or 15 seconds?   
  * Pull calls that transferred\~  
* How long were they on a call with the agent?   
* Were there multiple agents?

## Oct 13, 2025

Thomaz:

* Check in with Alan, on pace for delivering \~30 calls for audit by tonight

## Oct 9, 2025 \- Oct 10, 2025

Async update:  
![][image18]

## Oct 8, 2025

**Todo:**

* **Transition back to using Hawk calls**  
* **Add some time to the end of it and use speakers to figure it out**  
* **Overlapping part is the human agent**  
  * **Who each speaker is – user is probably the one you’ll hear speaking throughout the entire audio file, fair heuristic**  
* **Last speaker to join the conversation  \= human agent? Or the next speaker after the Netic call – maybe ask an LLM? If being repetitive, prob not human**  
* **Next speaker after Netic could be IVR**  
* **We know what the IVR sounds like, rely more on the transcript?**  
*   
* **Deliverables: Working first draft of the pipeline, run a backfill for \~30 \- 100 calls to get an idea of what it looks like**  
  * **Visualization, raw output data, \+ audio file**

Thomaz notes:

* Any ideas why some calls created\_at and created\_on are so far? Can’t consistently used modified\_on either (see second example)--could fuzzy match though.  
  * Should have reconciliation process to make sure IPC → ST Calls is correctly mapped  
  * **Check the mapping**  
  * **Don’t worry about modified on**  
  * **Ex: if call agent directly, no ST call but we take the most recent call from that phone number and connect the ST call id to IPC id. Refactor this eventually to only connect if sensible time.**

  ![][image19]![][image20] 

* Netic agent proxy using recording\_duration seems to work well for most cases

![][image21]

* Although there are some questionable ones, and it also seems to undershoot by a few seconds?

![][image22]

* **SOMETHING I NOTICED:**  
  * A\#1 calls seem to go to Netic only after \~50 seconds across most cases, is this a bug? Are the users supposed to wait 50 secs before connecting to netic?

**Assembly Slam-1 (5 errors) vs. Deepgram (5 errors) over 27 calls:**

* Assembly correctly gets 3 speakers and Deepgram gets 2: audio/raw\_recordings\_769643737\_2025\_09\_09\_621175509.wav  
* Assembly correctly gets 3 speakers and Deepgram gets 2: audio/raw\_recordings\_769643737\_2025\_09\_23\_624430283.wav  
* Assembly correctly gets 3 speakers and Deepgram gets 2: audio/raw\_recordings\_769643737\_2025\_09\_23\_624430283.wav  
* Assembly correctly gets 2 speakers and Deepgram gets 1: audio/raw\_recordings\_769643737\_2025\_09\_27\_630865669.wav  
* Assembly correctly gets 4 speakers and Deepgram gets 2: audio/raw\_recordings\_905122979\_2025\_09\_22\_167114993.wav

* Deepgram correctly gets 3 speakers and Assembly gets 2: audio/raw\_recordings\_769643737\_2025\_09\_09\_621175435.wav  
* Deepgram correctly 4, Assembly 3 audio/raw\_recordings\_769643737\_2025\_09\_20\_623828426.wav  
* Deepgram correctly gets 3 speakers and Assembly gets 2:  
* Deepgram correctly gets 4 speakers and Assembly gets 1 **REALLY BAD\!**: audio/raw\_recordings\_769643737\_2025\_09\_27\_630865669.wav  
* Deepgram correctly gets 3 speakers and Assembly gets 1: audio/raw\_recordings\_905122979\_2025\_09\_13\_166882893.wav

**Decision:** go with deepgram –faster, cheaper, and seems to be less egregious with its errors than assembly (slam-1)

* **Adjust timelines?** I won’t be super available Thursday, Friday due to a school trip. Frontloaded the week \+ weekend with experiments to hit my hours and will work today/tonight as I travel.   
  * Next steps for now are identifying holding \+ human speaker post-Netic call  
  * Idea: use LLM to identify which transcript sounds like non-IVR non-holding human speaker, get the first occurrence of that speaker or ask LLM to extract out the exact words from the transcript and use that as the timestamp for *Hit\_Human\_Agent*. Anything between Netic\_Call\_end and HHA will

## Oct 7, 2025

Thomaz notes:

* Approach using diarization \+ utterances deepgram api  
* Assumptions:  
  * Can i assume we can know for sure if a service titan call has a corresponding netic call with it? This would make classification much easier to determine what speaker netic is.  
    * **It is possible that the service titan call id is incorrect**  
    * **Fine to assume mostly correct and work from there**  
* Questions:  
  *  This should only run for inbound phone calls? Rn i have some outbound calls as well (see 769643737/2025/09/09/621175509.wav)  
  * **\>60% of calls audited had some issue or another with diarization, need to figure out best way forward given this truth**  
* Issues:  
  * Highly reliant on accurate diarization (see examples below):al  
  * It gets really messed up if **multiple people are talking in the background** (see call 769643737/2025/09/09/621175435.wav as an example) **this one got really messy**  
  * There is a case where the IVR speaker got combined with the voice of the actual end user calling (see call 769643737/2025/09/20/623828426.wav.txt), **this goes to show our reliance on accurate diarization, any ideas on how to prevent this or flag/catch?**  
  * Speaker diarization doesn’t seem super reliable, we see after transferring that the netic agent is still getting picked up, see image:   
  *   
  * There’s also the issue of two speakers being combined into one, the yellow part is 2 different speakers, in this case we could still get the event logging but goes to show **diarization isn’t super accurate**:

![][image23] 

* IVR keeps getting correlated with another speaker (call 769643737/2025/09/23/624430283.wav)  
  * Another issue of speakers combining (call 769643737/2025/09/27/630865057.wav):

 ![][image24]

* PSP hold has a speaker, new edge case where the holding line can be speaking, see call 905122979/2025/09/13/166882893.wav  
  * Combined speakers, call: 905122979/2025/09/29/167415394.wav  
  * PSP IVR has speaking, call: 905122979/2025/09/29/167415915.wav  
  * PSP IVR has speaking, call: 905122979/2025/10/01/167512659.wav

New approaches:

* 1\. Try Assembly for diarization, play around with min/max speaker  
* 2\. Look into ST call metadata to determine whether or not you have a human agent on this call – datatable  
* Start with calls with just Netic  
* 3\. Break out parts you know, then diarize the parts you don’t  
  * created\_on, duration \- might consistently underestimate  
  *       |------------|  
  * Do some fuzzy match on the right hand side  
* IVR: audio embeddings? – just try stuff

## Oct 6, 2025

Thomaz notes:

* Working on Temporal GCS uploads (got parallelization working on the tenant level and the GCS level), speed increase \~10-100x  
* Findings from ST audio file exploration:  
  * They are not multi-channel, means we need to rely on some way to diarize speakers  
  * Could use a STT service to diarize and get transcript or use pyannote to breakdown the audio file (example below)

![][image25]

* Questions:  
  * On the event logging:  
    * Lost on how to reliably differentiate between a human agent and a sophisticated AI agent since vocab/speech can be very similar--I'm concerned that simple audio analysis and transcript keywords will be too simplistic to work accurately  
    * Productionization of the pipeline? API approach using STT diarization and LLMs is fast for a prototype, but would be costly and rely quite a bit on heuristics. The other option would be consider building our own models for events (IVR vs. human, etc.) but this requires lots of labeled data and a good production plan  
    * **Try using Deepgram/Assembly multi-channel**  
    * **Run pipeline for A\#1 to see if they show up as multi-channel**  
    * **Lets see how far we can go in heuristics, could use Netic information to say which speaker on the agent side was us**  
      * **Then how do you split between IVR and human agent**  
      * **Using netic metadata: if we transferred, then …**  
    * **Then we can try to use something like pyannote with the actual audio**  
  * On temporal function:  
    * Any internal docs on how we build w/ temporal?  
    * 3h 47m to process 26k calls in one tenant (\~300k calls per \~4h then if we run 10 tenants in parallel)  
    * **Check with alan/teddy if 10qps is fine**  
    * **Hold on to a cursor (timestamp hold) to pick back up on recording calls**  
    * **Figure out how far back we want to go \~1yr?**  
  * **Priority 1: determine human agent and netic agent**  
    * **IVR is everything else, hold can be skipped**

## Oct 3, 2025

Thomaz notes:

* Upload to GCS:  
  * Ran it just for hoffmann for one day, uploaded all 1151 calls from Oct 2nd to GCS  
  * Still have to productionize/run on inngest?  
    * Start with last 2 months until 8/1  
    * Run it over the weekend, try to get 2 months or 4mo if possible  
    * Inngest vs. GCE dev box  
    * Get access to Inngest  
    * Make sure the storage limit won’t be violated  
  * Current (sequential upload) version: 17m45s to upload 1151 calls  
* DB schema sign off? 

## Oct 2, 2025

Update

* [Zi Gao](mailto:zi@netic.ai) is going to run the call backfill  
* Working on milestone 1  
  * ST API has changed since summer

Todo:

- [x] ~~Add folder for date in GCS: e.g. \<st\_tenant\_id\>/YYYY/MM/DD/\<id\>.mp3~~

## Oct 1, 2025

Agenda:

* Daily-ish sync on progress  
* Short term project goals:  
  * Build event log classification in \~1 week  
    * Does not need to be productionized – goal is research and good classification

## Sep 30, 2025 \- Kickoff

**ST All Call Data:** **Operation Bonito (it’s prettifier)**  
Given a set a ST Calls, we want to be able to know: 

* What are all the events that the customer interacted with?  
  * Events  
    * Hit the IVR   
    * Hit Netic  
    * Hit Human Agent  
    * Drop off  
    * Transferred Call (internally)  
    * Put on Hold  
  * Productionize this:   
    * Have a table in Analytics   
    * Querable in Hex  
    * Explorable in the frontend   
  * Can we splice the audio for that.  
* What is the transcript given the audio file?  
* Can we double check outcome classification against ST data (Note: ST data should not always be ground-truth)

# Service Titan Call Classifiers \- Project Bonito

## Motivation 

We and our customers want to have …

## Features / Requirements / Roadmap

| Milestone | Description | Timeline | Status |
| :---- | :---- | :---- | :---- |
| 1 | Hold all Service Titan Call Objects in our DB | **10/3** | Completed |
| 1 | Load all Audio Files into GCS Cloned copy of mp3. Not just a link.  | **10/3** | Completed (before productionization) |
| 2 | Have a schema in DB for events / transcript / etc  [Thomaz Bonato](mailto:thomaz@netic.ai) to present the DB schema.   [ST Call Event Logging DB Schema](https://docs.google.com/document/d/1MxoHLJhDgnYqHVVl7Tx7PssqiQ_2Sz9mMNUPrdK9DD0/edit?tab=t.0) | **10/3** | Completed |
| 2 | Have an event log for each call w/ associated meta just in our DB E.g.  Ops can go and easily listen to the non-AI agent part of the call.  Ops can understand what happened on the call by looking at the event log.  | **10/9-10/10** | Completed for 100 calls |
| 2.5 | How do we expose this data in the frontend process\~ | **10/13** |  |
| 3 | Classify the separate parts of the audio (outcome, objections, etc)We will want a cut of data for other people to review [st\_event\_logging](https://drive.google.com/drive/folders/1KLg_x68TFVsh-9k1_8v_CnEvv8oTKIGC?dmr=1&ec=wgc-drive-globalnav-goto) | **Run existing classifiers by 10/13** | Completed for 100 calls |

Given a set a ST Calls, we want to be able to know: 

* What are all the events that the customer interacted with?  
  * Events  
    * Hit the IVR   
    * Hit Netic  
    * Hit Human Agent  
    * Drop off  
    * Transferred Call (internally)  
    * Put on Hold  
  * Productionize this:   
    * Have a table in Analytics   
    * Querable in Hex  
    * Explorable in the frontend   
* What is the transcript given the audio file?

## Tech Specs:

[Thomaz Bonato](mailto:thomaz@netic.ai) to fill out 