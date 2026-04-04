#!/usr/bin/env python3
"""
Check Yosemite Valley campground availability for specific dates
Uses the /month endpoint which is confirmed working
Campground IDs: 232447, 232450, 232448
Dates: 2026-04-17 to 2026-04-19
"""

import json
import subprocess
from datetime import datetime
from urllib.parse import quote

USER_AGENT = "OpenClaw-Recreation-Checker/1.0"

# Campground names
CAMPGROUND_NAMES = {
    232447: "Yosemite Valley Campground (North Pines)",
    232450: "Upper Pines Campground",
    232448: "Lower Pines Campground",
}

def fetch_month(campground_id, month):
    """Fetch availability for a campground for a specific month."""
    query_date = f"{month}-01T00:00:00.000Z"
    encoded = quote(query_date, safe='')
    url = f"https://www.recreation.gov/api/camps/availability/campground/{campground_id}/month?start_date={encoded}"
    try:
        result = subprocess.run(
            ['curl', '-s', '-A', USER_AGENT, url],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode != 0:
            return None
        data = json.loads(result.stdout)
        if 'error' in data:
            return None
        return data
    except Exception:
        return None

def check_availability(campground_id, start_date_str, end_date_str):
    """Check availability for a campground across a date range."""
    # Get the months needed
    start_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date_str, "%Y-%m-%d")

    months = []
    year_month = f"{start_dt.year}-{start_dt.month:02d}"
    months.append(year_month)
    if start_dt.month != end_dt.month or start_dt.year != end_dt.year:
        year_month = f"{end_dt.year}-{end_dt.month:02d}"
        if year_month not in months:
            months.append(year_month)

    all_campsites = {}
    for month in months:
        data = fetch_month(campground_id, month)
        if not data or 'campsites' not in data:
            return []
        campsites = data['campsites']
        for site_id, site_data in campsites.items():
            if site_id not in all_campsites:
                all_campsites[site_id] = site_data
            else:
                # Merge availabilities
                existing = all_campsites[site_id]
                existing_avail = existing.get('availabilities', {})
                new_avail = site_data.get('availabilities', {})
                existing_avail.update(new_avail)
                existing['availabilities'] = existing_avail

    # Find sites that are available for all dates in range
    available_sites = []
    for site_id, site_data in all_campsites.items():
        avail_dict = site_data.get('availabilities', {})
        all_available = True
        available_dates = []
        current_dt = start_dt
        while current_dt <= end_dt:
            date_str = current_dt.strftime("%Y-%m-%d")
            ts = f"{date_str}T00:00:00Z"
            status = avail_dict.get(ts)
            if status != "Available":
                all_available = False
            else:
                available_dates.append(date_str)
            current_dt = datetime(current_dt.year, current_dt.month, current_dt.day + 1)
        if all_available:
            available_sites.append({
                'campsite_id': int(site_data.get('campsite_id', site_id)),
                'site': site_data.get('site', ''),
                'loop': site_data.get('loop', ''),
                'campsite_type': site_data.get('campsite_type', ''),
                'available_dates': available_dates
            })

    return available_sites

def main():
    start_date = "2026-04-17"
    end_date = "2026-04-19"

    print(f"Checking Yosemite Valley campground availability for {start_date} to {end_date}")
    print("=" * 80)

    total_available = 0
    results = []

    for cid in [232447, 232450, 232448]:
        name = CAMPGROUND_NAMES.get(cid, f"Campground {cid}")
        print(f"\nChecking: {name} (ID: {cid})")
        print("-" * 80)

        sites = check_availability(cid, start_date, end_date)
        count = len(sites)

        if count > 0:
            total_available += count
            print(f"  ✓ {count} site(s) available for all dates")
            for site in sites:
                print(f"    - Site {site['site']} (Loop: {site['loop']}, Type: {site['campsite_type']})")
        else:
            print(f"  ✗ No sites available for all dates")

        results.append({
            'campground_id': cid,
            'campground_name': name,
            'available_count': count,
            'sites': sites
        })

    print("\n" + "=" * 80)
    print(f"TOTAL AVAILABLE SITES ACROSS ALL CAMPGROUNDS: {total_available}")

    if total_available > 0:
        print("\n⚡ RECOMMENDATION: Book immediately at https://www.recreation.gov/")
    else:
        print("\nNo full-range availability found for these dates.")
        print("Check back later - cancellations may occur.")

    # Return JSON for programmatic use
    return {
        'start_date': start_date,
        'end_date': end_date,
        'total_available': total_available,
        'campgrounds': results
    }

if __name__ == "__main__":
    import sys
    result = main()
    # Output summary as JSON to stdout for logging
    print("\n--- JSON OUTPUT ---")
    print(json.dumps(result, indent=2))
