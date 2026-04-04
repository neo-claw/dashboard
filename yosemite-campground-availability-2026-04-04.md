# Yosemite Valley Campground Availability Check
**Date:** 2026-04-04 01:36 UTC  
**Requested Dates:** 2026-04-17 to 2026-04-19 (2 nights)  
**Campground IDs Checked:** 232447, 232450, 232448

## campground Identification

### 232447 - Upper Pines Campground
- **Location:** Yosemite Valley (heart of the valley)
- **Status:** Open seasonally (typically late April/May through September)
- **Reservation System:** Recreation.gov
- **Notes:** Largest of the three Valley campgrounds. Reservations open up to 5 months in advance on the 15th at 7:00 a.m. PST. Typically sells out in minutes.

### 232450 - Lower Pines Campground
- **Location:** Yosemite Valley
- **Status:** **Currently closed for winter season** (as of page fetch)
- **Reservation System:** Recreation.gov
- **Notes:** One of three reservation campgrounds in Yosemite Valley. Winter closure dates vary; typically opens in late spring.

### 232448 - Tuolumne Meadows Campground
- **Location:** Tuolumne Meadows (high country, ~55 miles from Yosemite Valley)
- **Status:** Open seasonally (typically late June/July through September, depending on snow)
- **Reservation System:** Recreation.gov
- **Notes:** High elevation (8,600 ft). NOT in Yosemite Valley - in the Tioga Pass area. Recent overhaul completed.

## Important Note: Campground ID Mismatch

**232448 (Tuolumne Meadows) is NOT in Yosemite Valley.** It's located along Tioga Road in the high country, approximately 55 miles from Yosemite Valley. This may not be what you're looking for if you specifically need Yosemite Valley campgrounds.

Yosemite Valley's three main reservation campgrounds are:
- Upper Pines (232447)
- Lower Pines (232450)
- **North Pines** (not in your list)

Missing: North Pines Campground (Recreation.gov ID would be needed)

## Availability Check Limitations

**Real-time availability cannot be determined via simple HTTP GET requests** because:
- Recreation.gov requires authentication (logged-in session) to view availability calendars
- Availability data is loaded via JavaScript with authenticated API calls
- The public API endpoints redirect to the main page without proper authentication headers

## Manual Verification Steps

To check actual availability for April 17-19, 2026:

1. **Visit Recreation.gov directly:**
   - Upper Pines: https://www.recreation.gov/camping/campgrounds/232447
   - Lower Pines: https://www.recreation.gov/camping/campgrounds/232450
   - North Pines: (search on Recreation.gov)

2. **Enter your dates** (April 17-19, 2026) in the availability calendar

3. **Consider the timing:** These dates would have become available for reservation on **November 15, 2025** (5 months before April 15). Since it's now April 4, 2026, these are very close dates and likely:
   - Fully booked (Yosemite campgrounds sell out months in advance)
   - May have last-minute cancellations (check frequently)

4. **Alternative:** Call Recreation.gov at 1-877-444-6777 or the Yosemite campground line at (209) 372-8502

## Seasonal Considerations for April 2026

- **Lower Pines:** Likely still in winter closure (often opens late April/May)
- **Upper Pines:** May open in late April depending on snow conditions; verify opening dates on NPS website
- **Tuolumne Meadows:** Almost certainly CLOSED in April (typically opens late June/July after snow melt)
- **North Pines:** Check current status

## Recommendations

1. **Verify campground IDs** - ensure 232448 is intentional (it's not in Yosemite Valley)
2. **Check North Pines** if you need all three Valley campgrounds
3. **Consider alternative dates** - April is early season; some facilities may not be open
4. **Monitor cancellations** - use Recreation.gov's "Availability Alerts" if offered
5. **Backup plan:** Consider campgrounds outside Yosemite Valley (e.g., in Mariposa, Groveland, or along the Merced River)

## Reservation Tips (from Recreation.gov)

- Login/create account **before** 7:00 a.m. PST on the 15th
- Campsites sell out in minutes
- Add to cart immediately when available
- Have backup dates ready

---

**Next Steps:** If you need automated availability monitoring, consider:
- Setting up a script with a headless browser and authenticated session
- Using third-party services like Campnab or CampScanner
- Checking the NPS Yosemite website for seasonal opening updates
