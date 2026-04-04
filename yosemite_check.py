#!/usr/bin/env python3
import requests
import json
from datetime import datetime, timedelta

# Campground IDs
CAMPGROUNDS = {
    232447: "Upper Pines",
    232450: "Lower Pines",
    232448: "Tuolumne Meadows"
}

# Dates to check: April 17-19, 2026 (check-in to check-out)
START_DATE = "2026-04-17"
END_DATE = "2026-04-19"

BASE_URL = "https://www.recreation.gov"
AVAILABILITY_ENDPOINT = BASE_URL + "/api/camps/availability/campground/{park_id}/month"

# Simple User-Agent
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

def get_availability(park_id, month_date):
    """Query the Recreation.gov API for availability in a given month."""
    params = {"start_date": month_date}
    url = AVAILABILITY_ENDPOINT.format(park_id=park_id)
    print(f"Fetching {url} with params {params}")
    resp = requests.get(url, params=params, headers=headers)
    if resp.status_code != 200:
        print(f"Error: {resp.status_code} for {url}")
        if resp.text:
            print(f"Response: {resp.text[:500]}")
        return None
    return resp.json()

def check_dates(park_id, park_name, start_date_str, end_date_str):
    """Check availability for specific dates in April 2026."""
    # We need to query the API with the first of the month in format: YYYY-MM-DDT00:00:00.000Z
    month_date = "2026-04-01T00:00:00.000Z"

    data = get_availability(park_id, month_date)
    if not data:
        return None

    # Parse the dates we're looking for
    start = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    end = datetime.strptime(end_date_str, "%Y-%m-%d").date()

    # Get all campsites and their availabilities
    campsites = data.get("campsites", {})

    available_sites = []
    for site_id, site_data in campsites.items():
        availabilities = site_data.get("availabilities", {})

        # Check if the site is available for all dates in our range
        dates_needed = []
        current = start
        while current <= end:
            date_str = current.strftime("%Y-%m-%d")
            dates_needed.append(date_str)
            current += timedelta(days=1)

        # Check if all needed dates are available
        all_available = True
        for date_str in dates_needed:
            if availabilities.get(date_str) != "Available":
                all_available = False
                break

        if all_available:
            available_sites.append({
                "site_id": site_id,
                "campsite_type": site_data.get("campsite_type", "Unknown"),
                "max_occupancy": site_data.get("max_occupancy", "N/A"),
            })

    return {
        "park_id": park_id,
        "park_name": park_name,
        "total_sites": len(campsites),
        "available_sites": len(available_sites),
        "sites": available_sites
    }

def main():
    print(f"Checking Yosemite Valley campground availability for {START_DATE} to {END_DATE} 2026\n")
    print("=" * 70)

    results = {}
    for park_id, park_name in CAMPGROUNDS.items():
        print(f"\nChecking {park_name} (ID: {park_id})...")
        result = check_dates(park_id, park_name, START_DATE, END_DATE)
        if result:
            results[park_id] = result

            total = result['total_sites']
            available = result['available_sites']

            if available > 0:
                print(f"  ✓ {available} site(s) available out of {total}")
                for site in result['sites'][:5]:  # Show first 5
                    print(f"    - Site {site['site_id']} ({site['campsite_type']}, max {site['max_occupancy']})")
                if available > 5:
                    print(f"    ... and {available - 5} more")
            else:
                print(f"  ✗ No sites available out of {total}")
        else:
            print(f"  ✗ Failed to fetch data")

    print("\n" + "=" * 70)
    print("Summary:")
    for park_id, result in results.items():
        status = "AVAILABLE" if result['available_sites'] > 0 else "SOLD OUT"
        print(f"  {result['park_name']}: {result['available_sites']}/{result['total_sites']} sites ({status})")

if __name__ == "__main__":
    main()
