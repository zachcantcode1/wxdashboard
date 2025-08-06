const https = require('https');

class PopulationService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    // Use 2023 Population Estimates Program (PEP) - official endpoint
    this.baseUrl = 'https://api.census.gov/data/2023/pep/charv';
  }

  /**
   * Fetch county population data from US Census API
   * @param {Array} fipsCodes - Array of 5-digit county FIPS codes
   * @returns {Promise<Object>} - Population data object
   */
  async getCountyPopulations(fipsCodes) {
    if (!fipsCodes || fipsCodes.length === 0) {
      return { totalPopulation: 0, counties: [], error: 'No FIPS codes provided' };
    }

    const validFips = fipsCodes.filter(fips => fips && fips.length === 5);
    if (validFips.length === 0) {
      return { totalPopulation: 0, counties: [], error: 'No valid FIPS codes provided' };
    }

    try {
      const counties = [];
      let totalPopulation = 0;

      // Process counties in batches to avoid overwhelming the API
      const batchSize = 10;
      for (let i = 0; i < validFips.length; i += batchSize) {
        const batch = validFips.slice(i, i + batchSize);
        const batchResults = await this.fetchCountyBatch(batch);
        
        counties.push(...batchResults.counties);
        totalPopulation += batchResults.totalPopulation;
      }

      return {
        totalPopulation,
        counties,
        fipsProcessed: validFips.length,
        fipsRequested: fipsCodes.length
      };

    } catch (error) {
      console.error('Error fetching county populations:', error);
      return { 
        totalPopulation: 0, 
        counties: [], 
        error: error.message,
        fipsProcessed: 0,
        fipsRequested: fipsCodes.length
      };
    }
  }

  /**
   * Fetch a batch of counties from Census API
   * @param {Array} fipsCodes - Array of FIPS codes to fetch
   * @returns {Promise<Object>} - Batch results
   */
  async fetchCountyBatch(fipsCodes) {
    const counties = [];
    let totalPopulation = 0;

    for (const fips of fipsCodes) {
      // Check cache first
      const cacheKey = `county_${fips}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
        counties.push(cached.data);
        totalPopulation += cached.data.population;
        continue;
      }

      try {
        // Validate FIPS code format
        if (!fips || fips.length !== 5 || !/^\d{5}$/.test(fips)) {
          console.warn(`Invalid FIPS code format: ${fips}`);
          continue;
        }

        // Extract state and county codes from FIPS
        const stateFips = fips.substring(0, 2);
        const countyFips = fips.substring(2, 5);

        // Construct Census API URL using 2023 PEP data with correct variables
        const url = `${this.baseUrl}?get=NAME,POP&for=county:${countyFips}&in=state:${stateFips}&YEAR=2023`;
        
        console.log(`Fetching population data for FIPS ${fips} from: ${url}`);
        
        const data = await this.makeHttpRequest(url);
        const jsonData = JSON.parse(data);

        if (jsonData && Array.isArray(jsonData) && jsonData.length > 1) {
          const countyData = jsonData[1]; // First row is headers, second is data
          const population = parseInt(countyData[1]) || 0;
          const name = countyData[0] || 'Unknown County';

          const countyInfo = {
            fips,
            name,
            population,
            stateFips,
            countyFips
          };

          // Cache the result
          this.cache.set(cacheKey, {
            data: countyInfo,
            timestamp: Date.now()
          });

          counties.push(countyInfo);
          totalPopulation += population;
          
          console.log(`Successfully fetched data for ${name} (${fips}): ${population.toLocaleString()} people`);
        } else {
          console.warn(`No valid data returned for FIPS ${fips}. Response:`, jsonData);
        }

        // Small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`Error fetching data for FIPS ${fips}:`, error.message);
        if (error.message.includes('400')) {
          console.error(`HTTP 400 error for FIPS ${fips} - this county code may not exist or be invalid`);
        }
        // Continue with other counties even if one fails
      }
    }

    return { counties, totalPopulation };
  }

  /**
   * Make HTTPS request to Census API
   * @param {string} url - URL to fetch
   * @returns {Promise<string>} - Response data
   */
  makeHttpRequest(url) {
    return new Promise((resolve, reject) => {
      const request = https.get(url, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          if (response.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          }
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * Extract county FIPS codes from UGC (Universal Geographic Code) identifiers
   * @param {Array} ugcCodes - Array of UGC codes (e.g., ['TXC001', 'TXC003'])
   * @returns {Array} - Array of 5-digit FIPS codes
   */
  extractCountyFipsFromUGC(ugcCodes) {
    if (!ugcCodes || !Array.isArray(ugcCodes)) {
      return [];
    }

    const fipsCodes = [];
    
    for (const ugc of ugcCodes) {
      if (!ugc || typeof ugc !== 'string') continue;
      
      // UGC format for counties: [STATE][C][###] (e.g., TXC001)
      // UGC format for zones: [STATE][Z][###] (e.g., TXZ001) - skip these
      const match = ugc.match(/^([A-Z]{2})C(\d{3})$/);
      
      if (match) {
        const stateCode = match[1];
        const countyCode = match[2];
        
        // Convert state abbreviation to FIPS code
        const stateFips = this.getStateFipsCode(stateCode);
        if (stateFips) {
          const fipsCode = stateFips + countyCode;
          fipsCodes.push(fipsCode);
        }
      }
    }

    return fipsCodes;
  }

  /**
   * Convert state abbreviation to FIPS code
   * @param {string} stateAbbr - Two-letter state abbreviation
   * @returns {string|null} - Two-digit FIPS code or null
   */
  getStateFipsCode(stateAbbr) {
    const stateFipsMap = {
      'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08', 'CT': '09', 'DE': '10',
      'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19', 'KS': '20',
      'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24', 'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28',
      'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34', 'NM': '35', 'NY': '36',
      'NC': '37', 'ND': '38', 'OH': '39', 'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45',
      'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54',
      'WI': '55', 'WY': '56', 'DC': '11'
    };

    return stateFipsMap[stateAbbr] || null;
  }

  /**
   * Format population number for display
   * @param {number} population - Population count
   * @returns {string} - Formatted string (e.g., "1.2M", "45K")
   */
  formatPopulation(population) {
    if (population >= 1000000) {
      return (population / 1000000).toFixed(1) + 'M';
    } else if (population >= 1000) {
      return (population / 1000).toFixed(0) + 'K';
    } else {
      return population.toString();
    }
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

module.exports = PopulationService;
