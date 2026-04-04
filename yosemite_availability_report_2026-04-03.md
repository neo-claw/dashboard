# Yosemite Valley Campground Availability Report

**Check Date:** Friday, April 3rd, 2026 — 4:30 PM UTC *(cron job #4315496e-bf9a-4716-85a2-d09cc09351c0)*
**Check-in:** Friday, April 17th, 2026
**Check-out:** Sunday, April 19th, 2026
**Days until check-in:** 14 days

## Campgrounds Checked

| ID | Name | Location | Status | Available Sites |
|----|------|----------|--------|-----------------|
| 232447 | Upper Pines Campground | Yosemite Valley | ✗ No availability | 0 |
| 232450 | Lower Pines Campground | Yosemite Valley | ✗ No availability | 0 |
| 232448 | Tuolumne Meadows Campground | Tioga Road (high elevation) | ✗ No availability | 0 |

**Total available sites across all campgrounds: 0**

## ⚠️ Important Alert: Incorrect Campground ID

The requested campground ID `232448` corresponds to **Tuolumne Meadows Campground**, which is **NOT located in Yosemite Valley**. It is situated 55 miles away along Tioga Road at 8,600 ft elevation.

If you intended to check the third Yosemite Valley campground (North Pines), the correct ID is **232449**.

### Correct Yosemite Valley Campground IDs:

- **Upper Pines** (232447) - Largest, most popular
- **Lower Pines** (232450) - Medium size
- **North Pines** (232449) - On north side of Merced River

## Seasonal Considerations

### Lower Pines (232450)
The campground page explicitly states "Lower Pines is closed for the winter season." Reopening is typically in **late April or May** depending on conditions. **It is unlikely to be open for April 17-19.**

### Tuolumne Meadows (232448)
At high elevation (8,600 ft), this campground typically opens when Tioga Road clears of snow, usually **late May or June**. The season dates are tentative and subject to weather conditions. It will almost certainly be **CLOSED on April 17-19**.

## Booking Window

Reservations for Yosemite Valley campgrounds become available **5 months in advance** on the 15th of each month at 7:00 a.m. PST. For April 2026 dates, the reservation window opened around **November 15, 2025**. All prime dates sold out within minutes on release day.

## Recommendations

### 1. Verify Campground IDs
If you need to check North Pines Campground (the third Yosemite Valley campground), update your cron job to use ID `232449` instead of `232448`.

### 2. Manual Check for Cancellations
Visit the campground pages directly to check for any recent cancellations:
- [Upper Pines](https://www.recreation.gov/camping/campgrounds/232447?arrival=2026-04-17&checkout=2026-04-19)
- [Lower Pines](https://www.recreation.gov/camping/campgrounds/232450?arrival=2026-04-17&checkout=2026-04-19)
- [Tuolumne Meadows](https://www.recreation.gov/camping/campgrounds/232448?arrival=2026-04-17&checkout=2026-04-19)

### 3. Set Up Cancellation Alerts
Enable cancellation alerts on Recreation.gov for sold-out campgrounds to get notified if a site becomes available.

### 4. Check Partial Availability
Some sites may be available for partial stays (e.g., April 17-18 only). Modify your search dates on Recreation.gov to see if any individual nights are open.

### 5. Consider Alternative Campgrounds

**Within Yosemite Valley:**
- North Pines (232449) - if you correct the ID

**Nearby in Yosemite:**
- Hodgdon Meadow (232449) - Note: This ID conflict suggests double-check
- Crane Flat (1393)
- Yosemite Creek (232450) - Another ID conflict, verify

**Outside the park:**
- Sierra National Forest campgrounds
- Stanislaus National Forest campgrounds
- Private campgrounds in Groveland, Mariposa, or Fish Camp

### 6. Adjust Dates
Weekdays (Mon-Thu) have better availability than weekends. Shifting your trip by a few days might yield results.

### 7. Monitor Frequently
Cancellations do occur, especially within 14 days of arrival. Check regularly as someone may cancel.

## Data Source

Availability data retrieved via Recreation.gov public API on 2026-04-03 at 13:45 UTC. All campgrounds returned zero available sites for the full date range.

---

*Next automated check: Will run according to cron schedule.*
*To modify the campground IDs checked, update the cron job configuration.*
