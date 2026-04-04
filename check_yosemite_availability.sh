#!/bin/bash
# Check Yosemite Valley Campground Availability
# Campground IDs: Upper Pines (232447), Lower Pines (232448), North Pines (232450)

CHECKIN="2026-04-17"
CHECKOUT="2026-04-19"
CAMP_START_DATE="2026-04-17"
CAMP_END_DATE="2026-04-19"

echo "=== Yosemite Valley Campground Availability Check ==="
echo "Dates: ${CHECKIN} to ${CHECKOUT}"
echo "Campgrounds: Upper Pines (232447), Lower Pines (232448), North Pines (232450)"
echo ""
echo "To check manually:"
echo "1. Go to https://www.recreation.gov/"
echo "2. Search for each campground by name or ID"
echo "3. Enter dates: ${CHECKIN} - ${CHECKOUT}"
echo ""
echo "Direct links (replace dates if needed):"
echo "Upper Pines: https://www.recreation.gov/camping/campgrounds/232447?arrival=${CHECKIN}&checkout=${CHECKOUT}"
echo "Lower Pines: https://www.recreation.gov/camping/campgrounds/232448?arrival=${CHECKIN}&checkout=${CHECKOUT}"
echo "North Pines: https://www.recreation.gov/camping/campgrounds/232450?arrival=${CHECKIN}&checkout=${CHECKOUT}"
echo ""
echo "Note: Yosemite campgrounds open year-round but some facilities may be seasonal."
echo "Current date: $(date -u)"
echo "Days until check-in: $(( ( $(date -d "${CHECKIN}" +%s) - $(date +%s) ) / 86400 ))"
