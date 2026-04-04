#!/usr/bin/env python3
"""
Check Yosemite Valley campground availability for April 17-18, 2026 (2 nights)
Campground IDs: 232447, 232450, 232448
"""

import requests

CAMPGROUND_IDS = [232447, 232450, 232448]
START_DATE = "2026-04-01T00:00:00.000Z"
BASE_URL = "https://www.recreation.gov/api/camps/availability/campground/{}/month"
HEADERS = {'User-Agent': 'Mozilla/5.0'}

# For stay April 17-19, need nights of 17th and 18th
TARGET_DATES = ["2026-04-17T00:00:00Z", "2026-04-18T00:00:00Z"]

CAMPGROUND_NAMES = {
    232447: "Yosemite Valley Campground (North Pines)",
    232450: "Upper Pines Campground",
    232448: "Lower Pines Campground",
}

def main():
    total_available = 0
    print("Checking Yosemite Valley campground availability for April 17-18, 2026 (2 nights)")
    print("=" * 70)
    for cid in CAMPGROUND_IDS:
        name = CAMPGROUND_NAMES.get(cid, f"Campground {cid}")
        print(f"\nChecking: {name} (ID: {cid})")
        print("-" * 50)
        url = BASE_URL.format(cid)
        try:
            response = requests.get(url, params={'start_date': START_DATE}, headers=HEADERS, timeout=30)
            if response.status_code != 200:
                print(f"  Error: HTTP {response.status_code}")
                continue
            data = response.json()
            if 'error' in data:
                print(f"  API Error: {data['error']}")
                continue
            available_sites = []
            for site_id, site_data in data.get('campsites', {}).items():
                avail = site_data.get('availabilities', {})
                all_available = all(avail.get(date, '') == 'Available' for date in TARGET_DATES)
                if all_available:
                    available_sites.append(site_id)
            count = len(available_sites)
            if count > 0:
                total_available += count
                print(f"  ✓ {count} site(s) available for both nights")
            else:
                print(f"  ✗ No sites available for both nights")
        except Exception as e:
            print(f"  Exception: {e}")
    print("\n" + "=" * 70)
    print(f"TOTAL AVAILABLE SITES: {total_available}")
    if total_available > 0:
        print("\nRECOMMENDATION: Book immediately at https://www.recreation.gov/")
    else:
        print("\nNo availability found for these dates.")

if __name__ == "__main__":
    main()
