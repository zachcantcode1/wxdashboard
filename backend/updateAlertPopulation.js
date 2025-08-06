const { createClient } = require('@supabase/supabase-js');
const PopulationService = require('./populationService');
require('dotenv').config();

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Population service
const populationService = new PopulationService();

/**
 * Extract UGC codes from alert data
 * @param {Object} alert - Alert object from database
 * @returns {Array} - Array of UGC codes
 */
function extractUGCFromAlert(alert) {
  const ugcCodes = [];
  
  // Try to extract from geometry if available
  if (alert.geometry && alert.geometry.properties && alert.geometry.properties.geocode) {
    const geocode = alert.geometry.properties.geocode;
    if (geocode.UGC) {
      if (Array.isArray(geocode.UGC)) {
        ugcCodes.push(...geocode.UGC);
      } else {
        ugcCodes.push(geocode.UGC);
      }
    }
  }
  
  // Try to extract from VTEC string as fallback
  if (ugcCodes.length === 0 && alert.vtec_string) {
    // VTEC format often contains UGC codes
    const vtecMatch = alert.vtec_string.match(/([A-Z]{2}[CZ]\d{3})/g);
    if (vtecMatch) {
      ugcCodes.push(...vtecMatch);
    }
  }
  
  // Try to extract from state_list and affected area as last resort
  if (ugcCodes.length === 0 && alert.state_list && alert.affectedarea) {
    // This is a heuristic approach - try to construct county codes
    const states = alert.state_list.split(',').map(s => s.trim());
    // This would require more sophisticated parsing, but for now we'll skip
    console.log(`Could not extract UGC codes for alert ${alert.id}, states: ${alert.state_list}`);
  }
  
  return ugcCodes;
}

/**
 * Update population data for a single alert
 * @param {Object} alert - Alert object from database
 * @returns {Promise<Object|null>} - Updated population data or null
 */
async function updateAlertPopulation(alert) {
  try {
    const ugcCodes = extractUGCFromAlert(alert);
    
    if (ugcCodes.length === 0) {
      console.log(`No UGC codes found for alert ${alert.id}`);
      return null;
    }
    
    console.log(`Processing alert ${alert.id} with UGC codes:`, ugcCodes);
    
    // Get county FIPS codes from UGC codes
    const fipsCodes = populationService.extractCountyFipsFromUGC(ugcCodes);
    
    if (fipsCodes.length === 0) {
      console.log(`No county FIPS codes extracted for alert ${alert.id} (likely zone-based alert)`);
      return null;
    }
    
    // Fetch population data
    const populationData = await populationService.getCountyPopulations(fipsCodes);
    
    if (populationData.totalPopulation > 0) {
      const updateData = {
        population_total: populationData.totalPopulation,
        population_formatted: populationService.formatPopulation(populationData.totalPopulation),
        population_counties: populationData.counties
      };
      
      // Update the alert in Supabase
      const { error } = await supabase
        .from('alerts')
        .update(updateData)
        .eq('id', alert.id);
      
      if (error) {
        console.error(`Error updating alert ${alert.id}:`, error);
        return null;
      }
      
      console.log(`Updated alert ${alert.id}: ${updateData.population_formatted} people affected`);
      return updateData;
    }
    
    return null;
  } catch (error) {
    console.error(`Error processing alert ${alert.id}:`, error);
    return null;
  }
}

/**
 * Main function to update all alerts with population data
 */
async function updateAllAlerts() {
  try {
    console.log('Starting population update for all alerts...');
    
    // Fetch all alerts that don't have population data yet
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .is('population_total', null)
      .order('createdat', { ascending: false });
    
    if (error) {
      console.error('Error fetching alerts:', error);
      return;
    }
    
    console.log(`Found ${alerts.length} alerts to process`);
    
    let processed = 0;
    let updated = 0;
    
    // Process alerts in batches to avoid overwhelming the Census API
    const batchSize = 5;
    for (let i = 0; i < alerts.length; i += batchSize) {
      const batch = alerts.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(alerts.length / batchSize)}`);
      
      const promises = batch.map(alert => updateAlertPopulation(alert));
      const results = await Promise.all(promises);
      
      processed += batch.length;
      updated += results.filter(result => result !== null).length;
      
      // Small delay between batches to be respectful to Census API
      if (i + batchSize < alerts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\nPopulation update complete!`);
    console.log(`Processed: ${processed} alerts`);
    console.log(`Updated: ${updated} alerts with population data`);
    console.log(`Skipped: ${processed - updated} alerts (no county data available)`);
    
  } catch (error) {
    console.error('Error in updateAllAlerts:', error);
  }
}

// Run the update if this script is executed directly
if (require.main === module) {
  updateAllAlerts().then(() => {
    console.log('Script completed');
    process.exit(0);
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { updateAlertPopulation, updateAllAlerts };
