import sys
import json
import os
import time
import subprocess
from datetime import datetime, timedelta
from urllib.parse import quote

USER_AGENT = "OpenClaw-Recreation-Checker/1.0"

# Fake data for test mode
FAKE_MONTH_DATA = {
    "campsites": {
        "99999": {
            "campsite_id": 99999,
            "site": "Test Site",
            "loop": "Loop A",
            "campsite_type": "STANDARD NONELECTRIC",
            "availabilities": {
                "2025-04-01T00:00:00Z": "Available",
                "2025-04-02T00:00:00Z": "Available",
                "2025-04-03T00:00:00Z": "Reserved"
            },
            "quantities": {}
        }
    }
}

def log(msg):
    print(f"[{datetime.utcnow().isoformat()}Z] {msg}", file=sys.stderr)

def get_months(start_date, end_date):
    """Return list of month strings 'YYYY-MM' for each month in range inclusive."""
    start_norm = start_date[:10]
    end_norm = end_date[:10]
    start_year = int(start_norm[:4])
    start_month = int(start_norm[5:7])
    end_year = int(end_norm[:4])
    end_month = int(end_norm[5:7])
    months = []
    year, month = start_year, start_month
    while True:
        months.append(f"{year}-{month:02d}")
        if year == end_year and month == end_month:
            break
        month += 1
        if month > 12:
            month = 1
            year += 1
    return months

def fetch_month_data(campground_id, month, test_mode=False):
    """Fetch data for a campground for a specific month. In test mode, returns FAKE_MONTH_DATA."""
    if test_mode:
        return FAKE_MONTH_DATA
    query_date = f"{month}-01T00:00:00.000Z"
    encoded = quote(query_date, safe='')
    url = f"https://www.recreation.gov/api/camps/availability/campground/{campground_id}/month?start_date={encoded}"
    retries = 3
    delay = 1
    for attempt in range(1, retries+1):
        log(f"Fetching {url} (attempt {attempt})")
        try:
            resp = subprocess.run(['curl', '-s', '-A', USER_AGENT, url], capture_output=True, text=True, timeout=30)
            if resp.returncode != 0:
                raise Exception(f"curl failed with code {resp.returncode}")
            data = json.loads(resp.stdout)
            if 'error' in data:
                err_msg = data.get('error', '')
                log(f"API error: {err_msg}")
                if attempt < retries:
                    time.sleep(delay)
                    delay *= 2
                    continue
                else:
                    raise Exception(f"API error: {err_msg}")
            return data
        except Exception as e:
            log(f"Request failed: {e}")
            if attempt < retries:
                time.sleep(delay)
                delay *= 2
                continue
            else:
                raise

def parse_available_sites(campground_id, all_campsites, start_date, end_date):
    """Parse the aggregated campsite data to extract available sites within the date range."""
    start_dt = datetime.strptime(start_date[:10], "%Y-%m-%d")
    end_dt = datetime.strptime(end_date[:10], "%Y-%m-%d")
    available_sites = []
    for site_id, site in all_campsites.items():
        avail_dict = site.get('availabilities', {})
        site_avail_dates = []
        for ts, status in avail_dict.items():
            if status != "Available":
                continue
            date_part = ts.split('T')[0]
            try:
                dt = datetime.strptime(date_part, "%Y-%m-%d")
            except ValueError:
                continue
            if start_dt <= dt <= end_dt:
                site_avail_dates.append(date_part)
        if site_avail_dates:
            available_sites.append({
                'campsite_id': int(site.get('campsite_id', site_id)),
                'site': site.get('site', ''),
                'loop': site.get('loop', ''),
                'campsite_type': site.get('campsite_type', ''),
                'available_dates': sorted(site_avail_dates)
            })
    return available_sites

def check_campground_availability(campground_id, start_date, end_date, test_mode=False):
    months = get_months(start_date, end_date)
    log(f"Querying months: {', '.join(months)}")
    all_campsites = {}
    for idx, month in enumerate(months):
        month_data = fetch_month_data(campground_id, month, test_mode=test_mode)
        campsites = month_data.get('campsites', {})
        for site_id, site_data in campsites.items():
            if site_id not in all_campsites:
                all_campsites[site_id] = site_data
            else:
                existing = all_campsites[site_id]
                existing_avail = existing.get('availabilities', {})
                new_avail = site_data.get('availabilities', {})
                existing_avail.update(new_avail)
                existing['availabilities'] = existing_avail
                existing_quant = existing.get('quantities', {})
                new_quant = site_data.get('quantities', {})
                existing_quant.update(new_quant)
                existing['quantities'] = existing_quant
        if len(months) > 1 and idx < len(months) - 1 and not test_mode:
            time.sleep(2)
    available_sites = parse_available_sites(campground_id, all_campsites, start_date, end_date)
    return available_sites

def has_availability_changed(prev_cache, current_result):
    """Determine if the availability has changed compared to previous cache."""
    count = len(current_result.get('availableSites', []))
    if count == 0:
        return False
    if prev_cache is None:
        return True
    try:
        prev_ids = set(prev_cache.get('campgroundIds', []))
        curr_ids = set(current_result.get('campgroundIds', []))
        if prev_ids != curr_ids:
            return True
        prev_sites = prev_cache.get('availableSites', [])
        prev_set = set()
        for s in prev_sites:
            key = (s['campsite_id'], s['campground_id'], tuple(sorted(s['available_dates'])))
            prev_set.add(key)
        curr_sites = current_result.get('availableSites', [])
        curr_set = set()
        for s in curr_sites:
            key = (s['campsite_id'], s['campground_id'], tuple(sorted(s['available_dates'])))
            curr_set.add(key)
        return prev_set != curr_set
    except Exception as e:
        log(f"Error comparing cache: {e}")
        return True
