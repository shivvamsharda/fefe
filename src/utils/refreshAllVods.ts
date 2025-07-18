
import { refreshAllVodDurations } from '@/services/vodService';

console.log('Starting bulk VOD duration refresh...');

// Execute the bulk refresh immediately
refreshAllVodDurations().then((result) => {
  console.log('Bulk VOD duration refresh completed:', result);
  if (result.results) {
    console.log(`Updated: ${result.results.updated}, Errors: ${result.results.errors}, Total: ${result.results.total}`);
  }
}).catch((error) => {
  console.error('Error during bulk refresh:', error);
});
