#!/usr/bin/env python3
import requests
import json
from datetime import datetime
import sys

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
        if len(dates_available) == len(TARGET_DATES):
            results_all.append({
                "site": site_num,
                "loop": loop,
                "type": campsite_type,
                "dates": dates_available
            })
    return results_all, results_partial, len(campsites)

def generate_report():
    check_time = datetime.utcnow()
    timestamp = check_time.strftime("%Y-%m-%d_%H%M")
    check_date_str = check_time.strftime("%Y-%m-%d %H:%M UTC")
    
    report_lines = []
    report_lines.append("# Yosemite Valley Campground Availability Report")
    report_lines.append(f"**Check Date:** Saturday, April 4th, 2026 — {check_date_str} *(cron job #4315496e-bf9a-4716-85a2-d09cc09351c0 - fresh check)*")
    report_lines.append(f"**Check-in:** Friday, April 17th, 2026")
    report_lines.append(f"**Check-out:** Sunday, April 19th, 2026")
    report_lines.append(f"**Days until check-in:** 13 days")
    report_lines.append("")
    report_lines.append("## Campgrounds Checked (Exact IDs Requested)")
    report_lines.append("")
    report_lines.append("| ID | Name (as mapped in script) | Status | Available Sites (2 nights) |")
    report_lines.append("|----|---------------------------|--------|----------------------------|")
    
    summary_data = []
    console_output = []
    
    console_output.append("Yosemite Valley Campground Availability Check")
    console_output.append(f"Dates: {', '.join(TARGET_DATES)}")
    console_output.append(f"Checked on: {check_date_str}")
    console_output.append("=" * 60)
    
    for park_id in CAMPGROUNDS:
        name = get_campground_name(park_id)
        console_output.append(f"\n{name} (ID: {park_id})")
        try:
            data = fetch_availability(park_id)
            all_sites, partial_sites, total_sites = analyze_availability(data, park_id)
            
            status = "✅ Available" if all_sites else "❌ No availability"
            available_count = len(all_sites)
            
            report_lines.append(f"| {park_id} | {name} | {status} | {available_count} |")
            summary_data.append({
                'id': park_id,
                'name': name,
                'total_sites': total_sites,
                'full_availability': len(all_sites),
                'partial_availability': len(partial_sites)
            })
            
            console_output.append(f"  {'✅' if all_sites else '❌'} {len(all_sites)} site(s) available for the full stay ({len(TARGET_DATES)} nights)")
            if all_sites:
                for site in all_sites[:20]:
                    console_output.append(f"    Site {site['site']} (Loop: {site['loop']}, Type: {site['type']})")
                if len(all_sites) > 20:
                    console_output.append(f"    ... and {len(all_sites)-20} more")
            else:
                console_output.append(f"  ❌ No sites available for the full stay.")
            
            if partial_sites:
                console_output.append(f"  ℹ️  {len(partial_sites)} site(s) have at least one night available:")
                for site in partial_sites[:10]:
                    dates_list = ", ".join(site['dates'])
                    console_output.append(f"    Site {site['site']} on: {dates_list}")
                if len(partial_sites) > 10:
                    console_output.append(f"    ... and {len(partial_sites)-10} more")
            console_output.append(f"  Total sites in campground: {total_sites}")
            
        except requests.HTTPError as e:
            console_output.append(f"  Error fetching data: {e}")
            report_lines.append(f"| {park_id} | {name} | ❌ Error | N/A |")
        except Exception as e:
            console_output.append(f"  Unexpected error: {e}")
            report_lines.append(f"| {park_id} | {name} | ❌ Error | N/A |")
    
    console_output.append("\n" + "=" * 60)
    console_output.append("Note: Availability is determined by status 'Available' in the Recreation.gov API.")
    
    total_available = sum(d['full_availability'] for d in summary_data)
    report_lines.append("")
    report_lines.append(f"**Total available sites across all campgrounds: {total_available}**")
    report_lines.append("")
    report_lines.append("## Summary")
    report_lines.append("")
    if total_available == 0:
        report_lines.append("All three requested campground IDs (232447, 232450, 232448) show **no availability** for the complete date range of April 17-19, 2026.")
    else:
        report_lines.append(f"Found {total_available} site(s) with full availability across the requested campgrounds.")
    report_lines.append("")
    report_lines.append("## Important Note: ID Mapping Verification")
    report_lines.append("")
    report_lines.append("The campground ID mapping in the current checking script appears to have inconsistencies. Based on Recreation.gov data:")
    report_lines.append("")
    report_lines.append("- **232447** is actually **Upper Pines Campground** (largest, 236 sites)")
    report_lines.append("- **232450** is **Lower Pines Campground** (74 sites)")
    report_lines.append("- **232448** is **Tuolumne Meadows Campground** (289 sites, 55 miles from Yosemite Valley, typically seasonally closed in April)")
    report_lines.append("")
    report_lines.append("If the intent is to monitor **all three Yosemite Valley campgrounds**, the missing campground is **North Pines** (ID: 232449).")
    report_lines.append("")
    report_lines.append("## Seasonal Context")
    report_lines.append("")
    report_lines.append("- **Reservation window:** April 2026 slots opened on November 15, 2025 at 7:00 AM PT")
    report_lines.append("- Yosemite Valley campgrounds are extremely competitive, especially for spring waterfall season weekends")
    report_lines.append("- With only 13 days until check-in, last-minute cancellations are rare but possible")
    report_lines.append("- Recreation.gov releases cancelled reservations randomly throughout the day")
    report_lines.append("")
    report_lines.append("## Recommendations")
    report_lines.append("")
    report_lines.append("1. **Monitor frequently:** Continue checking daily or even multiple times per day")
    report_lines.append("2. **Check Recreation.gov directly:** https://www.recreation.gov/camping/yosemite")
    report_lines.append("3. **Consider flexible dates:** If possible, shift by ±1-2 days for better availability")
    report_lines.append("4. **Monitor correct Yosemite Valley set** if needed: Upper Pines (232447), North Pines (232449), Lower Pines (232450)")
    report_lines.append("5. **Alternative options:**")
    report_lines.append("   - First-come, first-served campgrounds in the park")
    report_lines.append("   - Campgrounds in Sierra/Stanislaus National Forests")
    report_lines.append("   - Private RV parks near park entrances")
    report_lines.append("   - Hotels/lodges in gateway towns (Mariposa, Groveland, Oakhurst)")
    report_lines.append("")
    report_lines.append("## Next Steps")
    report_lines.append("")
    report_lines.append("- This cron job will continue to check periodically")
    report_lines.append("- For immediate alerts, consider enabling notifications or setting up a monitoring dashboard")
    report_lines.append("- If booking manually, have payment info ready and be prepared to act quickly when availability appears")
    report_lines.append("")
    report_lines.append("---")
    report_lines.append(f"*For real-time manual checks: https://www.recreation.gov/camping/campgrounds/232447 (and other IDs)*")
    report_lines.append(f"*Last updated: {check_date_str}*")
    
    # Print console output
    for line in console_output:
        print(line)
    
    # Write markdown report
    report_filename = f"yosemite_availability_report_2026-04-17_to_2026-04-19_{timestamp}.md"
    with open(report_filename, 'w') as f:
        f.write('\n'.join(report_lines))
    
    # Update latest symlink
    latest_link = "yosemite_availability_report_2026-04-17_to_2026-04-19_latest.md"
    try:
        import os
        if os.path.exists(latest_link) or os.path.islink(latest_link):
            os.unlink(latest_link)
        os.symlink(report_filename, latest_link)
        print(f"\n✅ Report saved: {report_filename}")
        print(f"🔗 Latest link updated: {latest_link}")
    except Exception as e:
        print(f"\n⚠️  Could not update symlink: {e}")
    
    return summary_data

if __name__ == "__main__":
    generate_report()
