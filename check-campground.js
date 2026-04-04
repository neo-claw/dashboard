const axios = require('axios');

const campgrounds = [232447, 232450, 232448];
const targetDate = '2026-04-17'; // Friday
const nights = 2; // Check April 17, 18, 19

async function checkCampground(id) {
  try {
    // Get campground info
    const campgroundResp = await axios.get(`https://www.recreation.gov/api/camps/campgrounds/${id}`);
    const campground = campgroundResp.data.campground;
    const name = campground.facility_name;
    
    // Get availability for April 2026
    const startDate = encodeURIComponent('2026-04-01T00:00:00.000Z');
    const availResp = await axios.get(`https://www.recreation.gov/api/camps/availability/campground/${id}/month?start_date=${startDate}`);
    
    const campsites = availResp.data.campsites;
    let availableSites = [];
    
    for (const [siteId, site] of Object.entries(campsites)) {
      const avail = site.availabilities;
      // Check if the site is available all nights
      const dates = [
        '2026-04-17T00:00:00Z',
        '2026-04-18T00:00:00Z', 
        '2026-04-19T00:00:00Z'
      ];
      
      const allAvailable = dates.every(date => avail[date] === 'Available');
      if (allAvailable) {
        availableSites.push({
          id: siteId,
          site: site.site,
          loop: site.loop,
          url: `https://www.recreation.gov/camping/campsites/${site.campsite_id}`
        });
      }
    }
    
    return {
      id,
      name,
      availableSites,
      totalSites: Object.keys(campsites).length
    };
  } catch (error) {
    return {
      id,
      error: error.message,
      response: error.response?.status
    };
  }
}

async function main() {
  console.log('Checking Yosemite Valley Campground Availability for April 17-19, 2026\n');
  
  for (const id of campgrounds) {
    const result = await checkCampground(id);
    
    if (result.error) {
      console.log(`Campground ${result.id}: ERROR (${result.response || 'network'})`);
    } else {
      console.log(`${result.name} (ID: ${result.id})`);
      console.log(`  Total sites: ${result.totalSites}`);
      if (result.availableSites.length > 0) {
        console.log(`  ✅ AVAILABLE: ${result.availableSites.length} site(s)`);
        result.availableSites.forEach(s => {
          console.log(`    - Site ${s.site} (${s.loop}): ${s.url}`);
        });
      } else {
        console.log(`  ❌ SOLD OUT - No sites available for all 3 nights`);
      }
      console.log('');
    }
  }
}

main().catch(console.error);
