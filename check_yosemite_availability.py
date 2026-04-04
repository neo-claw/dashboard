#!/usr/bin/env python3
import requests
import json
from datetime import datetime

# Campground IDs to check
CAMPGROUNDS = [232447, 232450, 232448]
# Target dates
TARGET_DATES = ["2026-04-17", "2026-04-18", "2026-04-19"]

def get_campground_name(park_id):
    names = {
        232447: "Upper Pines Campground",
        232450: "Lower Pines Campground",
        232448: "Tuolumne Meadows Campground"
    }
    return names.get(park_id, f"Campground {park_id}")

def fetch_availability(park_id):
    url = f"https://www.recreation.gov/api/camps/availability/campground/{park_id}/month"
    # April 2026, properly encoded: 2026-04-01T00:00:00.000Z
    params = {"start_date": "2026-04-01T00:00:00.000Z"}
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; OpenClaw/1.0)"
    }
    resp = requests.get(url, params=params, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()

def analyze_availability(data, park_id):
    results_all = []  # sites available for all target dates
    results_partial = []  # sites available for at least one target date
    campsites = data.get("campsites", {})
    for site_id, site in campsites.items():
        avail = site.get("availabilities", {})
        site_num = site.get("site", "?")
        loop = site.get("loop", "")
        campsite_type = site.get("campsite_type", "")
        dates_available = []
        for date in TARGET_DATES:
            iso_date = f"{date}T00:00:00Z"
            status = avail.get(iso_date, "Not Listed")
            if status == "Available":
                dates_available.append(date)
        if dates_available:
            results_partial.append({
                "site": site_num,
                "loop": loop,
                "type": campsite_type,
                "dates": dates_available
            })
        # For all dates: check if len(dates_available) == len(TARGET_DATES)
        if len(dates_available) == len(TARGET_DATES):
            results_all.append({
                "site": site_num,
                "loop": loop,
                "type": campsite_type,
                "dates": dates_available
            })
    return results_all, results_partial, len(campsites)

def main():
    print(f"Yosemite Valley Campground Availability Check")
    print(f"Dates: {', '.join(TARGET_DATES)}")
    print(f"Checked on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 60)

    for park_id in CAMPGROUNDS:
        name = get_campground_name(park_id)
        print(f"\n{name} (ID: {park_id})")
        try:
            data = fetch_availability(park_id)
            all_sites, partial_sites, total_sites = analyze_availability(data, park_id)
            if all_sites:
                print(f"  ✅ {len(all_sites)} site(s) available for the full stay ({len(TARGET_DATES)} nights):")
                for site in all_sites[:20]:
                    print(f"    Site {site['site']} (Loop: {site['loop']}, Type: {site['type']})")
                if len(all_sites) > 20:
                    print(f"    ... and {len(all_sites)-20} more")
            else:
                print(f"  ❌ No sites available for the full stay.")
            if partial_sites:
                # Show count of sites that have at least one date available
                print(f"  ℹ️  {len(partial_sites)} site(s) have at least one night available:")
                for site in partial_sites[:10]:
                    dates_list = ", ".join(site['dates'])
                    print(f"    Site {site['site']} on: {dates_list}")
                if len(partial_sites) > 10:
                    print(f"    ... and {len(partial_sites)-10} more")
            print(f"  Total sites in campground: {total_sites}")
        except requests.HTTPError as e:
            print(f"  Error fetching data: {e}")
        except Exception as e:
            print(f"  Unexpected error: {e}")

    print("\n" + "=" * 60)
    print("Note: Availability is determined by status 'Available' in the Recreation.gov API.")

if __name__ == "__main__":
    main()
