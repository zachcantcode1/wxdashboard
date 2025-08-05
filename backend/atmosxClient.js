const AtmosXWireParser = require('atmosx-nwws-parser');
const path = require('path');
const fs = require('fs');

// Toggle verbose logging
const VERBOSE = process.env.XMPP_VERBOSE === 'true';

/**
 * Sets up the AtmosX NWWS parser as a replacement for the custom XMPP client
 * @param {SocketIO.Server} io - Socket.IO server instance for emitting alerts
 * @returns {AtmosXWireParser} The configured parser instance
 */
const setupAtmosXClient = (io, alertsDB) => {
  // Ensure required directories exist
  const cacheDir = path.join(__dirname, 'atmosx_cache');
  const dbPath = path.join(__dirname, 'atmosx_database.db');
  const dbDir = path.dirname(dbPath);
  
  // Create directories if they don't exist
  try {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
      if (VERBOSE) console.log('Created AtmosX cache directory:', cacheDir);
    }
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      if (VERBOSE) console.log('Created AtmosX database directory:', dbDir);
    }
  } catch (error) {
    console.error('Error creating AtmosX directories:', error);
  }

  // Configuration for the AtmosX parser
  const config = {
    alertSettings: { 
      onlyCap: false, // Receive both CAP and non-CAP messages
      betterEvents: true, // Enable enhanced event handling
      ugcPolygons: false, // Start with basic UGC handling, can enable later
    },
    xmpp: {
      reconnect: true, // Enable automatic reconnection
      reconnectInterval: 60, // Reconnect every 60 seconds if disconnected
    },
    cacheSettings: {
      maxMegabytes: 20, // Increase cache size for better performance
      cacheDir: cacheDir, // Use the created cache directory
    },
    authentication: {
      username: 'zachary.miller', // Same username as current XMPP client
      password: 'K7_xGN8qSPRuJbR', // Same password as current XMPP client
      display: 'Weather Dashboard Client' // Display name for the client
    },
    database: dbPath, // SQLite database for UGC data
  };

  // Create the parser instance with error handling
  let client;
  try {
    client = new AtmosXWireParser(config);
    if (VERBOSE) console.log('AtmosX client created successfully');
  } catch (error) {
    console.error('Error creating AtmosX client:', error);
    throw error;
  }

  // Handle alert events - this replaces the custom alert parsing
  client.onEvent('onAlert', (alerts) => {
    if (VERBOSE) {
      console.log('=== RAW ATMOSX ALERT(S) ===');
      console.log('Number of alerts:', Array.isArray(alerts) ? alerts.length : 1);
      console.log(JSON.stringify(alerts, null, 2));
      console.log('============================');
    }
    
    // AtmosX returns an array of alerts, process each one
    const alertArray = Array.isArray(alerts) ? alerts : [alerts];
    
    alertArray.forEach((alert, index) => {
      // Transform the alert to match your current frontend expectations
      const transformedAlert = transformAlertFormat(alert);
      
      if (VERBOSE) {
        console.log(`=== TRANSFORMED ALERT ${index + 1} ===`);
        console.log(JSON.stringify(transformedAlert, null, 2));
        console.log('===============================');
      }
      
      if (transformedAlert) {
        // Store alert in database
        if (alertsDB) {
          alertsDB.storeAlert(transformedAlert).catch(err => {
            console.error('Error storing alert in database:', err);
          });
        }
        
        // Emit alert to connected clients
        io.emit('new-alert', transformedAlert);
      }
    });
  });

  // Handle storm reports - new functionality not available in current system
  client.onEvent('onStormReport', (report) => {
    if (VERBOSE) {
      console.log('Storm Report received:', report);
    }
    // Emit storm reports as a new event type
    io.emit('storm-report', report);
  });

  // Handle mesoscale discussions - new functionality
  client.onEvent('onMesoscaleDiscussion', (discussion) => {
    if (VERBOSE) {
      console.log('Mesoscale Discussion received:', discussion);
    }
    // Emit mesoscale discussions as a new event type
    io.emit('mesoscale-discussion', discussion);
  });

  // Handle raw messages for debugging
  client.onEvent('onMessage', (message) => {
    if (VERBOSE) {
      console.log('Raw XMPP message received');
    }
  });

  // Handle occupant changes in the XMPP room
  client.onEvent('onOccupant', (occupant) => {
    if (VERBOSE) {
      console.log('Room occupant change:', occupant);
    }
  });

  // Handle errors
  client.onEvent('onError', (error) => {
    console.error('AtmosX Client error:', error);
  });

  // Handle reconnection events
  client.onEvent('onReconnect', (service) => {
    if (VERBOSE) {
      console.log(`AtmosX Client reconnected (attempt ${service.reconnects})`);
    }
    // Update display name to show reconnection count
    client.setDisplayName(`Weather Dashboard Client (x${service.reconnects})`);
  });

  return client;
};

/**
 * Transforms AtmosX alert format to match current frontend expectations
 * @param {Object} alert - Alert object from AtmosX parser
 * @returns {Object|null} Transformed alert or null if not suitable for display
 */
function transformAlertFormat(alert) {
  if (!alert) return null;

  try {
    // AtmosX parser returns alerts with this structure:
    // { id, tracking, action, history, properties: { areaDesc, expires, event, description, ... }, geometry }
    
    const props = alert.properties || {};
    
    // Extract key fields from AtmosX structure
    const headline = props.event || 'Weather Alert';
    const description = props.description || '';
    const event = props.event || 'Alert';
    const expires = props.expires ? props.expires.toISOString() : 'N/A';
    const areaDesc = props.areaDesc || 'Area not specified';
    
    // Extract VTEC information from tracking
    const vtecString = alert.tracking || 'N/A';
    
    // Extract states from UGC codes
    const states = extractStatesFromUGC(props.geocode?.UGC || []);
    
    // Extract hazard parameters if available
    const parameters = props.parameters || {};
    
    // Extract parameters data directly
    const alertParameters = {
      WMOidentifier: parameters.WMOidentifier || null,
      tornadoDetection: parameters.tornadoDetection || null,
      maxHailSize: parameters.maxHailSize || null,
      maxWindGust: parameters.maxWindGust || null,
      thunderstormDamageThreat: parameters.thunderstormDamageThreat || null
    };
    
    console.log('=== ALERT TRANSFORMATION DEBUG ===');
    console.log('Alert ID:', alert.id);
    console.log('Parameters extracted:', JSON.stringify(alertParameters, null, 2));
    console.log('=== END DEBUG ===');
    
    // Create the transformed alert matching your frontend structure
    const transformed = {
      id: alert.id || Date.now().toString(),
      productType: event,
      affectedArea: areaDesc,
      headline: headline,
      description: description,
      expires: expires,
      rawText: description || 'No detailed text available.',
      vtecString: vtecString,
      geometry: alert.geometry || null,
      states: states,
      parameters: alertParameters, // Add parameters information
      
      // Additional fields for debugging
      _original: VERBOSE ? alert : undefined
    };

    return transformed;
  } catch (error) {
    console.error('Error transforming alert format:', error);
    if (VERBOSE) {
      console.error('Problematic alert object:', JSON.stringify(alert, null, 2));
    }
    return null;
  }
}

/**
 * Extracts geometry information from area data
 * @param {Object|Array} areaData - Area information from alert
 * @returns {Object|null} Geometry object or null
 */
function extractGeometry(areaData) {
  if (!areaData) return null;
  
  try {
    const areas = Array.isArray(areaData) ? areaData : [areaData];
    
    for (const area of areas) {
      if (area.polygon && typeof area.polygon === 'string') {
        const coordPairs = area.polygon.split(' ');
        const coordinates = coordPairs.map(pair => {
          const parts = pair.split(',');
          return [parseFloat(parts[0]), parseFloat(parts[1])];
        });
        return { type: 'Polygon', coordinates: [coordinates] };
      } else if (area.circle && typeof area.circle === 'string') {
        const parts = area.circle.split(' ');
        if (parts.length === 2) {
          const centerPair = parts[0].split(',');
          const center = [parseFloat(centerPair[0]), parseFloat(centerPair[1])];
          const radiusKm = parseFloat(parts[1]);
          return { type: 'Circle', coordinates: center, radius: radiusKm * 1000 };
        }
      }
    }
  } catch (error) {
    if (VERBOSE) console.error('Error extracting geometry:', error);
  }
  
  return null;
}

/**
 * Extracts state information from UGC codes
 * @param {Array} ugcCodes - Array of UGC codes from AtmosX alert
 * @returns {Array} Array of state codes
 */
function extractStatesFromUGC(ugcCodes) {
  if (!ugcCodes || !Array.isArray(ugcCodes)) return [];
  
  const states = new Set();
  
  try {
    ugcCodes.forEach(ugc => {
      if (typeof ugc === 'string' && ugc.length >= 2) {
        states.add(ugc.substring(0, 2));
      }
    });
  } catch (error) {
    if (VERBOSE) console.error('Error extracting states from UGC:', error);
  }
  
  return Array.from(states);
}

/**
 * Extracts state information from area data (legacy function for compatibility)
 * @param {Object|Array} areaData - Area information from alert
 * @returns {Array} Array of state codes
 */
function extractStates(areaData) {
  if (!areaData) return [];
  
  const states = new Set();
  
  try {
    const areas = Array.isArray(areaData) ? areaData : [areaData];
    
    for (const area of areas) {
      if (area.geocode) {
        const geocodes = Array.isArray(area.geocode) ? area.geocode : [area.geocode];
        geocodes.forEach(geo => {
          if (geo.valueName === 'UGC' && geo.value) {
            const ugcValues = Array.isArray(geo.value) ? geo.value : [geo.value];
            ugcValues.forEach(ugc => {
              if (typeof ugc === 'string' && ugc.length >= 2) {
                states.add(ugc.substring(0, 2));
              }
            });
          }
        });
      }
    }
  } catch (error) {
    if (VERBOSE) console.error('Error extracting states:', error);
  }
  
  return Array.from(states);
}

module.exports = { setupAtmosXClient };
