const axios = require('axios');

const campgrounds = [232447, 232450, 232448];
// Need site for nights of April 17 and April 18 (check-in 17, check-out 19)
const neededDates = ['2026-04-17T00:00:00Z', '2026-04-18T00:00:00Z'];

async function checkCampground(id) {
  try {
    // Get campground info
    const campgroundResp = await axios.get(`https://www.recreation.gov/api/camps/campgrounds/${id}`);
    const name = campgroundResp.data.campground.facility_name;
    
    // Get availability for April 2026
    const startDate = encodeURIComponent('2026-04-01T00:00:00.000Z');
    const availResp = await axios.get(`https://www.recreation.gov/api/camps/availability/campground/${id}/month?start_date=${startDate}`);
    
    const campsites = availResp.data.campsites;
    const availableSites = [];
    
    for (const [siteId, site] of Object.entries(campsites)) {
      const avail = site.availabilities;
      const allNeededAvailable = neededDates.every(date => avail[date] === 'Available');
      if (allNeededAvailable) {
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
  console.log('=== Yosemite Valley Campground Availability ===');
  console.log('Check-in: April 17, 2026 (Friday)');
  console.log('Check-out: April 19, 2026 (Sunday)');
  console.log('Nights: 2 (April 17 & 18)\n');
  
  let anyAvailable = false;
  
  for (const id of campgrounds) {
    const result = await checkCampground(id);
    
    if (result.error) {
      console.log(`❌ ${result.name || 'Campground ' + result.id}: API error`);
    } else {
      if (result.availableSites.length > 0) {
        anyAvailable = true;
        console.log(`✅ ${result.name} (ID: ${result.id})`);
        console.log(`   Total sites: ${result.totalSites}`);
        console.log(`   Available sites: ${result.availableSites.length}`);
        result.availableSites.forEach(s => {
          console.log(`   - Site ${s.site} (${s.loop}): ${s.url}`);
        });
        console.log('');
      } else {
        console.log(`❌ ${result.name} (ID: ${result.id})`);
        console.log(`   Total sites: ${result.totalSites} - SOLD OUT for these dates`);
        console.log('');
      }
    }
  }
  
  if (!anyAvailable) {
    console.log('\n⚠️  All campgrounds are sold out for April 17-19, 2026.');
    console.log('Consider alternative dates or check back for cancellations.');
  }
}

main().catch(console.error);
