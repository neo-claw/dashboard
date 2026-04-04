
context from [[email ask]]

The ask (Start with Hoffmann Nash):
>1. **Historical visibility of each day’s capacity** (i.e., what was our daily utilization that day defined as [total shift hours booked _divided by_ total shifts hours available]) within each tenant, for each business unit.
>2. **A forward-looking view** that shows the average % booked of total available capacity of the next 3/5/10 days within each tenant, for each business unit.
>3. The above information **available in an easily digestible format(s**) to include dashboards and exportable reports that can be auto generated and/or shared daily with internal stakeholders / agency partners.

Questions:
- You guys mentioned *"a manual process of selecting each business unit within each tenant, and then having to relay that information to Tinuiti (our paid ads agency) so they can update budgets"*
	- We want to make the whole process automated through API, **what existing connections do you guys have to link to your ads? Any api**?
- We would like to set this up using a settings page with rules that trigger ad spend changes — similar to what was said in the email (see below) 

> 1) if ABC business unit has average % booked of total available capacity for next 3 days **>115%**, then decrease daily paid ads spending to **70%** of daily paid ads budget (for relevant adgroups / campaigns);
> 2) if ABC business unit has average % booked of total available capacity for next 3 days between **100%-115%**, then decrease daily paid ads spending to **85%** of daily paid ads budget;

High level issue:
- adjusting budget
- spend more when we need more calls, ad vice versa too
- utilization allows us to manage and measure that
- % utilization --> budget ratio to figure out where we should push and pull on budget
- couple ways
	- 1)
		- log in every day and check utilization
	- 2)
		- data feed of current day util, next 3, 5,  etc. etc. by tenant / business unit
		- match tenant + business unit to relevant campaigns
	- raw data feed or csv everyday that then match to their own data and try with NASH to pilot the automated

Management: goes Job Type --> Business Unit
Board: Business Unit only

Issue of techs running between the business units

GLSA campaign to category (plumbing, brand, electrical, etc.)
campaigns --> actual job % match is low

Waterfall -- hard to understand ad optimization:
- organic, brand, service line
- brand is more of the budget than service line

Dummy data
- Use back information to understand and develop guidepost on whether or not we should increase decrease ad spend
	- Understand 

Teddy question: how granular do we care about keywords
- bifurcate on repair vs replace
	- usually people dont search maintenance
- hence why intent match is hard -- keywords dont match directly the search, people search different things

Digital Side:
- majority is google, google saerch, glsa, regional understanding of what you are going to trigger for, lsa is entirely different
- experiemnting with meta, service titan integration is bad for anything outside google
- No existing connection with Google Ads
	- Rule of 20 for google, 20% increments over time, you force the algorithm and efficiency goes to crap
	- Within +/- 20% of capacity, don't want to change the ad spend, if we creep falling then trigger gradual move
	- Matthias for 

Email to them via CSG:
- email export is fine 
- most important thing is consistency of when its delivered, store this and build historical lookbacks
- Figuring out the fidelity problem

Sending dummy report to us, the CSV is really helpful because we can build it in to the porcess, helps Tinuity (T-NEW-e-TEE) a LOT)

- Dashboard
- Export CSV
- Automated reports

Roll up the related groupings

From Justin:
- dummy report
- intentionality data -- after nov 13th is when we new campaign setup

---

## Summary

Hoffmann (Nash) needs a utilization dashboard that shows historical and forward-looking capacity (booked hours / available hours) by tenant and business unit, with daily CSV exports and automated reporting to their paid ads agency, Tinuiti. The goal is to eventually automate ad budget adjustments via rules tied to utilization thresholds (e.g., >115% booked → reduce spend to 70%), but there's currently no Google Ads API connection, so the near-term path is a daily data feed/CSV that Tinuiti ingests manually — to be piloted with Nash first. Key constraints: Google's Rule of 20 (max 20% budget changes at a time), keyword intent mismatch between campaigns and actual job types, and complexity from techs operating across multiple business units. Next step: Justin to send a dummy report + post-Nov 13 intentionality data so we can build the historical baseline and fidelity logic.

#### Msg:

Update: met with Hoffmann just now --  clarified how they will use utilization dashboard + daily CSV exports to Tinuiti (their paid ads agency) to drive budget decisions. Near-term plan by end of weekend is a daily data feed of a CSV including historical and future utilization data to be processed manually by Tinuiti. 

Regarding automation in the near-term, it would have to be a similar setup where Matthias / an ad expert goes in and manually makes the changes. Justin brought up how ad changes are very sensitive in Google and can negatively impact CPA.