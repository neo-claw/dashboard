import sys
import os
import pytest

# Add parent directory to path to import recreation_check module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from recreation_check import get_months, parse_available_sites, has_availability_changed, FAKE_MONTH_DATA

def test_get_months():
    # Same month
    assert get_months("2025-01-15", "2025-01-20") == ["2025-01"]
    # Two months
    assert get_months("2025-01-20", "2025-02-10") == ["2025-01", "2025-02"]
    # Year boundary
    assert get_months("2024-12-15", "2025-01-15") == ["2024-12", "2025-01"]
    # Same day
    assert get_months("2025-03-10", "2025-03-10") == ["2025-03"]
    # Longer range
    assert get_months("2025-01-01", "2025-12-31") == [f"2025-{m:02d}" for m in range(1, 13)]

def test_parse_available_sites():
    # Test parsing of available vs reserved
    all_campsites = {
        "1": {
            "campsite_id": 1,
            "site": "Site A",
            "loop": "L1",
            "campsite_type": "Standard",
            "availabilities": {
                "2025-04-01T00:00:00Z": "Available",
                "2025-04-02T00:00:00Z": "Reserved",
                "2025-04-03T00:00:00Z": "Available",
                "2025-04-04T00:00:00Z": "Available",
            },
            "quantities": {}
        },
        "2": {
            "campsite_id": 2,
            "site": "Site B",
            "loop": "L2",
            "campsite_type": "Premium",
            "availabilities": {
                "2025-04-01T00:00:00Z": "Reserved",
                "2025-04-02T00:00:00Z": "Reserved",
            },
            "quantities": {}
        }
    }
    start_date = "2025-04-01"
    end_date = "2025-04-04"
    result = parse_available_sites(1, all_campsites, start_date, end_date)
    # Only site 1 has available dates (site 2 has none)
    assert len(result) == 1
    site = result[0]
    assert site['campsite_id'] == 1
    assert site['site'] == "Site A"
    assert site['loop'] == "L1"
    assert site['campsite_type'] == "Standard"
    # Should include 2025-04-01, 2025-04-03, 2025-04-04 (within range and Available)
    assert set(site['available_dates']) == {"2025-04-01", "2025-04-03", "2025-04-04"}

def test_parse_available_sites_empty():
    all_campsites = {}
    result = parse_available_sites(1, all_campsites, "2025-04-01", "2025-04-03")
    assert result == []

def test_has_availability_changed():
    current = {
        'campgroundIds': ['1'],
        'availableSites': [
            {'campsite_id': 1, 'campground_id': 1, 'available_dates': ['2025-04-01']},
            {'campsite_id': 2, 'campground_id': 1, 'available_dates': ['2025-04-02']}
        ]
    }
    # No previous cache
    assert has_availability_changed(None, current) == True

    # Same as previous -> no change
    prev = current.copy()
    assert has_availability_changed(prev, current) == False

    # Different available dates for one site -> change
    current2 = {
        'campgroundIds': ['1'],
        'availableSites': [
            {'campsite_id': 1, 'campground_id': 1, 'available_dates': ['2025-04-01', '2025-04-02']}
        ]
    }
    assert has_availability_changed(prev, current2) == True

    # Different campground IDs -> change
    current3 = {
        'campgroundIds': ['2'],
        'availableSites': current['availableSites']
    }
    assert has_availability_changed(prev, current3) == True

    # Zero available sites -> no change (even if prev had sites? Actually function returns False if count==0 immediately)
    zero = {'campgroundIds': [], 'availableSites': []}
    assert has_availability_changed(None, zero) == False
    # Even if prev had sites, current zero implies no notification
    assert has_availability_changed(current, zero) == False

    # Malformed prev cache -> should return True (treat as changed)
    assert has_availability_changed({}, current) == True
    assert has_availability_changed({'bad': 'data'}, current) == True

def test_fake_month_data_structure():
    # Ensure fake data is structured correctly for test mode
    assert "campsites" in FAKE_MONTH_DATA
    assert "99999" in FAKE_MONTH_DATA["campsites"]
    site = FAKE_MONTH_DATA["campsites"]["99999"]
    assert site["campsite_id"] == 99999
    assert "availabilities" in site
    # At least one available date in range 2025-04-01 to 2025-04-03
    avail = site["availabilities"]
    assert "2025-04-01T00:00:00Z" in avail
    assert avail["2025-04-01T00:00:00Z"] == "Available"
    assert "2025-04-02T00:00:00Z" in avail
    assert "2025-04-03T00:00:00Z" in avail and avail["2025-04-03T00:00:00Z"] == "Reserved"
