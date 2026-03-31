| Outcome | Reason | Subreason | Definition | Technical |
| --- | --- | --- | --- | --- |
| Booked | Booked | Booked | Appointment was successfully scheduled. Job type breakdown (HVAC, plumbing, etc.) is a separate dimension and not part of reason/sub-reason. | New job created in CRM by the Netic Agent |
| Unbooked | Timing objection | Too Late | Earliest available appointment is too far out for the customer | Timing objection classifier |
| Unbooked | Timing objection | Emergency Service Unavailable | Customer needed emergency service but none was available | Timing objection classifier |
| Unbooked | Timing objection | Customer Timing Conflict | Other scheduling conflicts — e.g. customer can only do weekends or late afternoons | Timing objection classifier |
| Unbooked | Price objection | Price objection | Customer abandoned the call after learning the price | Price objection classifier |
| Unbooked | Need to speak to third party | Family Member | Customer wants to check with a family member before committing | Service objection classifier |
| Unbooked | Went with Other | Went with Competitor (Pricing) | Customer decided to go to a competitor due to pricing | Competitor objection classifier |
| Unbooked | Went with Other | Went with Competitor (Timing) | Customer decided to go to a competitor due to timing | Competitor objection classifier |
| Unbooked | Went with Other | Went with Competitor (Other) | Customer decided to go to a competitor for other/unclear reasons | Competitor objection classifier |
| Unbooked | Went with Other | Will Try to Solve on Their Own | Customer decided to solve the problem DIY or via friend, family, or neighbor | Competitor objection classifier |
| Unbooked | AI objection | AI objection | Customer refused to continue with AI and no transfer was completed | Sentiment classifier (negative) + AI frustration signal |
| Unbooked | Friction | Information Confirmation Issues | Booking failed due to trouble confirming the customer's details (address, name, etc.) | Sentiment classifier (negative) + confirmation failure signal |
| Unbooked | Friction | Too Many Questions | Customer dropped off citing frustration with the number of questions | Sentiment classifier (negative) + excessive questions signal |
| Unbooked | Friction | General Frustration in Conversation | Customer showed general frustration | Sentiment classifier (negative) + general frustration signal |
| Unbooked | Disconnected | Other | Call ended without a clear reason — no objection signal identified | No objection classifier fired on an unbooked call |
| Handled | Price shopping | Price shopping | Caller's goal was to gather pricing info with no intent to book | Intent classifier (price shopping sub-intent) |
| Handled | Need to speak to third party | Need to speak to Landlord | Caller needs landlord sign-off; treated as Handled since it's a service-blocking constraint, not just a timing issue | Service objection classifier |
| Handled | Need to speak to third party | No Authority to Book - Other | Caller cannot authorize the booking themselves | Service objection classifier |
| Handled | Service not offered | Outside Service Area | Customer intended to book but is outside the service area | Service objection classifier |
| Handled | Service not offered | Unsupported Job or Trade | Customer intended to book but the job or trade is not supported | Service objection classifier |
| Handled | Appointment confirmed | Appointment confirmed | Customer confirmed their upcoming appointment time | Intent + outcome classifiers |
| Handled | Appointment rescheduled | Appointment rescheduled | Agent successfully moved an existing appointment to a new date or time | Intent + outcome classifiers |
| Handled | Appointment checked | Appointment checked | Customer checked on their appointment and asked about its details | Intent + outcome classifiers |
| Handled | Appointment updated | Appointment updated | Customer added additional info for their upcoming appointment | Intent + outcome classifiers |
| Handled | Appointment cancellation | Scheduling Conflicts | Cancelled existing appointment due to scheduling conflicts (e.g. sick, family emergency, other appointment) | Intent classifier + timing objection classifier |
| Handled | Appointment cancellation | Went with Competitor (Pricing) | Cancelled existing appointment and went with a competitor for pricing reasons | Intent classifier + competitor objection classifier |
| Handled | Appointment cancellation | Went with Competitor (Timing) | Cancelled existing appointment and went with a competitor for timing reasons | Intent classifier + competitor objection classifier |
| Handled | Appointment cancellation | Went with Competitor (Other) | Cancelled existing appointment and went with a competitor for other/unclear reasons | Intent classifier + competitor objection classifier |
| Handled | Appointment cancellation | DIY Solve | Cancelled existing appointment because the customer solved it themselves | Intent classifier + competitor objection classifier |
| Handled | Appointment cancellation | Problem Fixed Itself | Cancelled existing appointment because the problem fixed itself | Intent classifier + competitor objection classifier |
| Handled | Appointment cancellation | Cannot Afford | Cancelled existing appointment because they could not afford it (cost too high, financing declined, insurance issues, etc.) | Intent classifier + price objection classifier |
| Handled | Appointment cancellation | Other Cancel Reason | Cancelled for other/unknown reason | Intent classifier (no specific objection signal on cancellation) |
| Handled | General inquiry | Business Hours or Location Serviced | Customer inquired about business hours or locations served | Intent classifier |
| Handled | General inquiry | Trades or Technician Qualifications | Customer inquired about technician qualifications or trades serviced | Intent classifier |
| Handled | General inquiry | Partnerships inquiry | Caller inquired about business partnerships or referral arrangements | Intent classifier |
| Handled | General inquiry | Insurance or Payment Options | Customer inquired about insurance or payment options | Intent classifier |
| Handled | Admin Questions | Billing | Customer asked billing questions | Intent classifier |
| Handled | Admin Questions | Membership | Customer asked membership questions. Modifying membership is live transfer; getting membership details is TAKE A NOTE | Intent classifier |
| Handled | Admin Questions | Warranty | Customer asked warranty questions | Intent classifier |
| Handled | Admin Questions | Permits, Certifications, and Government Inspections | Customer asked about permits, certifications, or other government-related questions | Intent classifier |
| Handled | Admin Questions | Career inquiry | Caller inquiring about a career opportunity | Intent classifier |
| Handled | Spam call | Spam call | The call is spam or irrelevant — gibberish, prank calls, sales/telemarketing, auto-reply, or unrelated to the business | Intent classifier (excused — spam) |
| Handled | Excused | Wrong Number | Caller called the wrong number | Intent classifier (excused) |
| Handled | Excused | Telemarketer | Caller is a salesperson / telemarketer | Intent classifier (excused) |
| Handled | Excused | Internal Call | Call between two internal phone numbers (employees or technicians) | Intent classifier (excused) |
| Handled | Excused | Other | Call had no significant interaction but doesn't fit the above | Intent classifier (excused) |
| Not enough info | No Response | No Response | No meaningful interaction occurred — the call had no transcript or the caller provided no substantive response | No transcript recorded, or intent classifier returns no meaningful interaction |
| Not enough info | Requested call back | Requested call back | Caller hung up quickly after indicating they would call back | Intent classifier (excused — callback) with no transfer completed |
| Not enough info | Requested human | Preference for Human | Caller immediately asked for a human with no booking context, and no transfer was completed | Intent classifier (excused — requested representative) with no transfer completed |
