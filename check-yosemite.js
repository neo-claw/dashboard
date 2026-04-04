const { findCampsite } = require('find-campsite');

async function checkCampgrounds() {
  const campgrounds = [232447, 232450, 232448];
  const startDate = '2026-04-17';  // Friday
  const endDate = '2026-04-19';    // Sunday
  const nights = 2;

  for (const campgroundId of campgrounds) {
    try {
      console.log(`\nChecking campground ${campgroundId}...`);
      const result = await findCampsite({
        campground: campgroundId,
        startDate: startDate,
        endDate: endDate,
        api: 'recreation_gov',
      });
      
      console.log(`Campground ${campgroundId}:`);
      console.log(`  Available: ${result.available ? 'YES' : 'NO'}`);
      if (result.available) {
        console.log(`  Dates: ${result.dates ? result.dates.join(', ') : 'N/A'}`);
        console.log(`  Min nights: ${result.minNights || 'N/A'}`);
        console.log(`  Max nights: ${result.maxNights || 'N/A'}`);
      } else {
        console.log(`  Reason: ${result.reason || 'no sites available'}`);
      }
    } catch (error) {
      console.error(`Campground ${campgroundId} error:`, error.message);
    }
  }
}

checkCampgrounds().then(() => console.log('\nCheck complete.'));
