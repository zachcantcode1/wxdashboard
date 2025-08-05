require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const RADAR_CACHE_DIR = path.join(__dirname, 'radar_cache');


const VERBOSE = process.env.XMPP_VERBOSE === 'true';
// Replace old XMPP client with AtmosX parser
const { setupAtmosXClient } = require('./atmosxClient');
// Import Supabase alerts database
const SupabaseAlertsDatabase = require('./supabaseAlertsDatabase');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Socket.IO with CORS configuration to allow our frontend to connect
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for maximum compatibility
    methods: ['GET', 'POST'],
  },
});

// Initialize Supabase client for user authentication
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Middleware to authenticate requests
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.sendStatus(401); // if there isn't any token

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.sendStatus(403); // if token is no longer valid
  }

  req.user = user;
  next();
};

// Initialize Supabase alerts database
const alertsDB = new SupabaseAlertsDatabase();

// Schedule hourly cleanup of expired alerts
setInterval(async () => {
  try {
    const deletedCount = await alertsDB.cleanupExpiredAlerts();
    if (deletedCount > 0) {
      console.log(`[Cleanup] Removed ${deletedCount} expired alerts`);
    }
  } catch (error) {
    console.error('[Cleanup] Error during scheduled alert cleanup:', error);
  }
}, 60 * 60 * 1000); // Run every hour (60 minutes * 60 seconds * 1000 milliseconds)

console.log('[Cleanup] Scheduled hourly cleanup of expired alerts');

// Root route for Railway health checks
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Weather Dashboard Backend API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve radar images from cache
app.get('/api/radar/:time', (req, res) => {
  const time = req.params.time;
  const fileName = `${time}.png`;
  const filePath = path.join(RADAR_CACHE_DIR, fileName);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).send('Radar image not found');
  }
});

// Alerts API endpoints
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await alertsDB.getActiveAlerts();
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

app.get('/api/alerts/all', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const alerts = await alertsDB.getAllAlerts(limit);
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching all alerts:', error);
    res.status(500).json({ error: 'Failed to fetch all alerts' });
  }
});



// LSR (Local Storm Reports) endpoint with server-side processing
app.get('/api/lsr/today', async (req, res) => {
  try {
    console.log('Fetching and processing LSR data...');
    
    // Fetch LSR data from NOAA
    const fetch = require('node-fetch');
    const response = await fetch('https://mapservices.weather.noaa.gov/vector/rest/services/obs/nws_local_storm_reports/MapServer/0/query?where=1%3D1&outFields=*&f=geojson');
    
    if (!response.ok) {
      throw new Error(`NOAA API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.features) {
      return res.json({ type: 'FeatureCollection', features: [] });
    }
    
    // Filter and process data
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const processedFeatures = data.features
      .filter(feature => {
        const props = feature.properties;
        
        // Filter for current day only
        if (props.lsr_validtime) {
          const reportTime = new Date(props.lsr_validtime);
          if (reportTime < todayStart || reportTime >= todayEnd) {
            return false;
          }
        }
        
        // Filter out rain/flood reports
        const description = (props.descript || '').toLowerCase();
        if (description.includes('rain') || 
            description.includes('heavy rain') || 
            description.includes('excessive rainfall') ||
            description.includes('rainfall') ||
            description.includes('precipitation') ||
            description.includes('flooding rain') ||
            description.includes('flood')) {
          return false;
        }
        
        return true;
      })
      .map(feature => {
        // Add icon information to each feature
        const description = (feature.properties.descript || '').toLowerCase();
        const iconInfo = getLsrIconInfo(description);
        
        return {
          ...feature,
          properties: {
            ...feature.properties,
            iconType: iconInfo.type,
            iconClass: iconInfo.iconClass,
            iconColor: iconInfo.color
          }
        };
      });
    
    const processedData = {
      type: 'FeatureCollection',
      features: processedFeatures
    };
    
    console.log(`Processed LSR data: ${processedFeatures.length} reports from today (excluding rain/flood)`);
    
    // Cache for 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(processedData);
    
  } catch (error) {
    console.error('Error processing LSR data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch LSR data',
      message: error.message 
    });
  }
});

// Helper function to determine LSR icon information
function getLsrIconInfo(description) {
  const lowerDescript = description.toLowerCase();
  
  if (lowerDescript.includes('rain')) {
    return { type: 'rain', iconClass: 'fas fa-cloud-showers-heavy', color: '#4682B4' };
  } else if (lowerDescript.includes('hail')) {
    return { type: 'hail', iconClass: 'fas fa-cloud-meatball', color: '#ADD8E6' };
  } else if (lowerDescript.includes('tstm wnd gst') || lowerDescript.includes('tstm wnd dmg') || lowerDescript.includes('non-tstm wnd gst')) {
    return { type: 'wind', iconClass: 'fas fa-wind', color: '#87CEEB' };
  } else if (lowerDescript.includes('tornado')) {
    return { type: 'tornado', iconClass: 'fas fa-tornado', color: '#FF0000' };
  } else if (lowerDescript.includes('funnel cloud')) {
    return { type: 'funnel', iconClass: 'fas fa-tornado', color: '#FFA500' };
  } else if (lowerDescript.includes('flash flood') || lowerDescript.includes('flood')) {
    return { type: 'flood', iconClass: 'fas fa-water', color: '#0000FF' };
  } else if (lowerDescript.includes('debris flow') || lowerDescript.includes('mudslide')) {
    return { type: 'debris', iconClass: 'fas fa-house-flood-water', color: '#A0522D' };
  } else if (lowerDescript.includes('snow')) {
    return { type: 'snow', iconClass: 'fas fa-snowflake', color: '#FFFFFF' };
  } else if (lowerDescript.includes('sleet') || lowerDescript.includes('freezing rain')) {
    return { type: 'sleet', iconClass: 'fas fa-icicles', color: '#AFEEEE' };
  } else if (lowerDescript.includes('lightning')) {
    return { type: 'lightning', iconClass: 'fas fa-bolt', color: '#FFFF00' };
  } else {
    return { type: 'other', iconClass: 'fas fa-circle-info', color: '#007bff' };
  }
}

// OLD ENDPOINT REMOVED - Using newer endpoint below that works with JSON-only files
















// ===================== WSI Config and History Endpoints =====================

// Serve read-only WSI weights from a JSON file
const WSI_WEIGHTS_PATH = path.join(__dirname, 'wsi-weights.json');

// Ensure default weights file exists with sane defaults
function ensureDefaultWsiWeights() {
 try {
   if (!fs.existsSync(WSI_WEIGHTS_PATH)) {
     const defaultWeights = {
       version: 1,
       halfLives: { alertsHours: 6, reportsHours: 9 },
       caps: { alertsScore: 250, reportsScore: 250 },
       blend: { alertsWeight: 0.6, reportsWeight: 0.4 },
       alertBase: {
         "tornado warning": 10,
         "severe thunderstorm warning": 6,
         "flash flood warning": 5,
         "tornado watch": 4,
         "severe thunderstorm watch": 3,
         "special weather statement": 2,
         "advisory": 2,
         "other": 1
       },
       alertBonuses: {
         tornadoDetection: { observed: 12, radar: 8 },
         thunderstormDamageThreat: { destructive: 8, considerable: 5, base: 2 },
         hail: { thresholdInches: 0.75, perQuarterInch: 0.5, maxBonus: 8 },
         wind: { thresholdMph: 50, atThreshold: 1, per5Mph: 0.5, maxBonus: 8 },
         multiState: { perStateBeyondOne: 1, maxBonus: 5 }
       },
       reportBase: {
         "tornado": 12,
         "significant wind damage": 6,
         "wind damage": 6,
         "wind gust": 4,
         "hail": 4,
         "funnel cloud": 5,
         "flash flood": 5,
         "blizzard": 6,
         "ice": 6,
         "other": 3
       },
       reportBonuses: {
         tornado: { ef: { "0": 1, "1": 2, "2": 4, "3": 7, "4": 10, "5": 14 }, debris: 4 },
         hail: { thresholdInches: 0.75, perQuarterInch: 0.5, maxBonus: 6 },
         wind: { thresholdMph: 50, atThreshold: 1, per5Mph: 0.5, maxBonus: 6 },
         remarksBoosts: { widespread: 2, significant: 3, catastrophic: 4 }
       }
     };
     fs.writeFileSync(WSI_WEIGHTS_PATH, JSON.stringify(defaultWeights, null, 2), 'utf-8');
     console.log('[WSI] Created default wsi-weights.json');
   }
 } catch (err) {
   console.error('[WSI] Failed to ensure default weights:', err);
 }
}
ensureDefaultWsiWeights();

app.get('/api/wsi-weights', (req, res) => {
 try {
   const raw = fs.readFileSync(WSI_WEIGHTS_PATH, 'utf-8');
   const json = JSON.parse(raw);
   res.setHeader('Cache-Control', 'no-store');
   res.json(json);
 } catch (err) {
   console.error('[WSI] Error reading weights:', err);
   res.status(500).json({ error: 'Failed to read WSI weights' });
 }
});

// In-memory WSI history (rolling 24h)
let wsiHistory = []; // [{ ts: ISOString, value: number }]

// Trim history to last 24 hours
function trimWsiHistory() {
 const cutoff = Date.now() - 24 * 60 * 60 * 1000;
 wsiHistory = wsiHistory.filter(p => {
   const t = new Date(p.ts).getTime();
   return !isNaN(t) && t >= cutoff;
 });
}

app.get('/api/wsi-history', (req, res) => {
 try {
   trimWsiHistory();
   res.setHeader('Cache-Control', 'no-store');
   res.json({ points: wsiHistory });
 } catch (err) {
   console.error('[WSI] Error reading history:', err);
   res.status(500).json({ error: 'Failed to read WSI history' });
 }
});

app.post('/api/wsi-history', (req, res) => {
 try {
   const { value, ts } = req.body || {};
   const num = Number(value);
   if (!isFinite(num)) {
     return res.status(400).json({ error: 'Invalid value' });
   }
   const timestamp = ts ? new Date(ts) : new Date();
   if (isNaN(timestamp.getTime())) {
     return res.status(400).json({ error: 'Invalid timestamp' });
   }
   wsiHistory.push({ ts: timestamp.toISOString(), value: Math.round(num) });
   trimWsiHistory();
   res.json({ success: true, count: wsiHistory.length });
 } catch (err) {
   console.error('[WSI] Error writing history:', err);
   res.status(500).json({ error: 'Failed to write WSI history' });
 }
});

// ===========================================================================

const PORT = process.env.PORT || 3001;

// Current Weather endpoint
app.get('/api/weather/:zipcode', async (req, res) => {
  const { zipcode } = req.params;
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  console.log('Using OpenWeatherMap API Key:', apiKey ? `${apiKey.substring(0, 4)}...` : 'Not found');
  const url = `https://api.openweathermap.org/data/2.5/weather?zip=${zipcode},us&appid=${apiKey}&units=imperial`;

  try {
    const fetch = require('node-fetch');
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
      res.json(data);
    } else {
      res.status(response.status).json({ error: data.message || 'Error fetching weather data' });
    }
  } catch (error) {
    console.error('Error fetching weather data:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Geocoding endpoint
app.get('/api/geocode/:zipcode', async (req, res) => {
  const { zipcode } = req.params;
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  const url = `http://api.openweathermap.org/geo/1.0/zip?zip=${zipcode},US&appid=${apiKey}`;

  try {
    const fetch = require('node-fetch');
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok && data) {
      res.json({ lat: data.lat, lon: data.lon, name: data.name });
    } else {
      res.status(response.status).json({ error: data.message || 'Error fetching geocoding data' });
    }
  } catch (error) {
    console.error('Error fetching geocoding data:', error);
    res.status(500).json({ error: 'Failed to fetch geocoding data' });
  }
});

// One Call Weather endpoint
app.get('/api/one-call-weather', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely&appid=${apiKey}&units=imperial`;

  try {
    const fetch = require('node-fetch');
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
      res.json(data);
    } else {
      res.status(response.status).json({ error: data.message || 'Error fetching one-call weather data' });
    }
  } catch (error) {
    console.error('Error fetching one-call weather data:', error);
    res.status(500).json({ error: 'Failed to fetch one-call weather data' });
  }
});

// User-specific endpoints for home location
app.get('/api/user/home-location', authenticateToken, (req, res) => {
  const homeZipcode = req.user.user_metadata?.home_zipcode;
  if (homeZipcode) {
    res.json({ home_zipcode: homeZipcode });
  } else {
    // It's okay if a user doesn't have one set, so we don't send an error status
    res.json({ home_zipcode: null });
  }
});

app.put('/api/user/home-location', authenticateToken, async (req, res) => {
  const { zipcode } = req.body;
  if (!zipcode) {
    return res.status(400).json({ error: 'Zipcode is required.' });
  }

  try {
    const { data, error } = await supabase.auth.admin.updateUserById(
      req.user.id,
      { user_metadata: { ...req.user.user_metadata, home_zipcode: zipcode } }
    );

    if (error) throw error;

    res.json({ success: true, message: 'Home location updated successfully.' });
  } catch (error) {
    console.error('Error updating user home location:', error);
    return res.status(500).json({ error: 'Failed to update home location.' });
  }
});

// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
  if (VERBOSE) console.log(`Socket.IO client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    if (VERBOSE) console.log(`Socket.IO client disconnected: ${socket.id}`);
  });
});

// --- Start the AtmosX NWWS Parser ---
// We pass the `io` instance to the AtmosX client so it can send alerts to the frontend.
// Future Radar Layer API endpoints
// Generate forecast times (every 15 minutes for 18 hours = 72 intervals)
const generateForecastTimes = () => {
  const times = [];
  // HRRR typically provides forecasts every 15 minutes out to 18 hours
  for (let i = 0; i <= 72; i++) {
    const minutes = i * 15;
    times.push(minutes);
  }
  return times;
};

// Format model run time for IEM URL (YYYYMMDDHHMI format)
const formatModelRunForURL = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}`;
};

// Create tile URL for a specific forecast time
const createForecastTileUrl = (forecastMinutes, modelRun = null) => {
  const forecastStr = `F${String(forecastMinutes).padStart(4, '0')}`;
  
  if (modelRun) {
    const modelRunDate = new Date(modelRun);
    const modelRunStr = formatModelRunForURL(modelRunDate);
    return `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD-${forecastStr}-${modelRunStr}/{z}/{x}/{y}.png`;
  } else {
    return `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD-${forecastStr}-0/{z}/{x}/{y}.png`;
  }
};

// Cache for model run data
let modelRunCache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000 // 5 minutes
};

// Get latest model run information
app.get('/api/radar/future/model-runs', async (req, res) => {
  try {
    // Check cache first
    const now = Date.now();
    if (modelRunCache.data && modelRunCache.timestamp && (now - modelRunCache.timestamp < modelRunCache.ttl)) {
      return res.json(modelRunCache.data);
    }

    // Fetch fresh data
    const response = await fetch('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_0000.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    const result = {
      modelRun: data.model_init_utc,
      validTime: data.valid_utc,
      timestamp: now
    };
    
    // Update cache
    modelRunCache = {
      data: result,
      timestamp: now,
      ttl: modelRunCache.ttl
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching model run data:', error);
    res.status(500).json({ error: 'Failed to fetch model run data' });
  }
});

// Get all forecast layer information
app.get('/api/radar/future/layers', async (req, res) => {
  try {
    const forecastTimes = generateForecastTimes();
    
    // Get current model run (use cached if available, otherwise fetch fresh)
    let modelRun = null;
    const now = Date.now();
    if (modelRunCache.data && modelRunCache.timestamp && (now - modelRunCache.timestamp < modelRunCache.ttl)) {
      modelRun = modelRunCache.data.modelRun;
    } else {
      // Fetch fresh model run data if cache is empty or expired
      try {
        const response = await fetch('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_0000.json');
        if (response.ok) {
          const data = await response.json();
          modelRun = data.model_init_utc;
          
          // Update cache
          modelRunCache = {
            data: {
              modelRun: data.model_init_utc,
              validTime: data.valid_utc,
              timestamp: now
            },
            timestamp: now,
            ttl: modelRunCache.ttl
          };
        }
      } catch (fetchError) {
        console.error('Error fetching model run in layers endpoint:', fetchError);
        // Continue with null modelRun - will use fallback URLs
      }
    }
    
    const layers = forecastTimes.map(minutes => ({
      forecastMinute: minutes,
      tileUrl: createForecastTileUrl(minutes, modelRun),
      forecastHours: Math.floor(minutes / 60),
      forecastMinutesRemainder: minutes % 60
    }));
    
    res.json({
      modelRun,
      layers,
      totalLayers: layers.length
    });
  } catch (error) {
    console.error('Error generating forecast layers:', error);
    res.status(500).json({ error: 'Failed to generate forecast layers' });
  }
});

// Get specific forecast layer information
app.get('/api/radar/future/layers/:forecastMinute', async (req, res) => {
  try {
    const forecastMinute = parseInt(req.params.forecastMinute, 10);
    
    if (isNaN(forecastMinute) || forecastMinute < 0 || forecastMinute > 1080) {
      return res.status(400).json({ error: 'Invalid forecast minute. Must be between 0 and 1080.' });
    }
    
    // Get current model run (use cached if available)
    let modelRun = null;
    const now = Date.now();
    if (modelRunCache.data && modelRunCache.timestamp && (now - modelRunCache.timestamp < modelRunCache.ttl)) {
      modelRun = modelRunCache.data.modelRun;
    }
    
    const layer = {
      forecastMinute,
      tileUrl: createForecastTileUrl(forecastMinute, modelRun),
      forecastHours: Math.floor(forecastMinute / 60),
      forecastMinutesRemainder: forecastMinute % 60,
      modelRun
    };
    
    res.json(layer);
  } catch (error) {
    console.error('Error generating forecast layer:', error);
    res.status(500).json({ error: 'Failed to generate forecast layer' });
  }
});

const atmosxClient = setupAtmosXClient(io, alertsDB);
console.log('Weather Dashboard Backend started with AtmosX NWWS Parser');

// --- Radar Warnings Layer API endpoints
console.log('[DEBUG] Registering radar warnings API endpoints...');

// Generate radar times (every 5 minutes for the past 3 hours)
const generateRadarTimes = () => {
  const times = [];
  const now = new Date();
  
  // Round down to the nearest 5-minute mark
  const currentMinutes = now.getUTCMinutes();
  const roundedMinutes = Math.floor(currentMinutes / 5) * 5;
  now.setUTCMinutes(roundedMinutes, 0, 0);
  
  // Generate times for the past 3 hours (36 intervals of 5 minutes)
  for (let i = 0; i < 36; i++) {
    const time = new Date(now.getTime() - (i * 5 * 60 * 1000));
    times.unshift({
      datetime: time,
      timestamp: time.toISOString(),
      display: time.toLocaleTimeString('en-US', {
        timeZone: 'America/Chicago',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }) + ' CT'
    });
  }
  
  return times;
};

// Create WMS URL for radar layer
const createRadarLayerUrl = (timestamp) => {
  return {
    wmsUrl: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r-t.cgi',
    layers: 'nexrad-n0r-wmst',
    format: 'image/png',
    transparent: true,
    time: timestamp,
    version: '1.1.1',
    crs: 'EPSG:4326',
    attribution: ' Iowa Environmental Mesonet'
  };
};

// Cache for radar times data
let radarTimesCache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000 // 5 minutes
};

// Get available radar times
app.get('/api/radar/warnings/times', (req, res) => {
  console.log('[DEBUG] Radar warnings times endpoint hit');
  try {
    const now = Date.now();
    
    // Check if we have valid cached data
    if (radarTimesCache.data && radarTimesCache.timestamp && (now - radarTimesCache.timestamp < radarTimesCache.ttl)) {
      console.log('[DEBUG] Returning cached radar times:', radarTimesCache.data.length, 'items');
      return res.json(radarTimesCache.data);
    }
    
    // Generate fresh radar times
    const radarTimes = generateRadarTimes();
    console.log('[DEBUG] Generated fresh radar times:', radarTimes.length, 'items');
    
    // Update cache
    radarTimesCache = {
      data: radarTimes,
      timestamp: now,
      ttl: radarTimesCache.ttl
    };
    
    res.json(radarTimes);
  } catch (error) {
    console.error('Error generating radar times:', error);
    res.status(500).json({ error: 'Failed to generate radar times' });
  }
});

// Get all radar layer information
app.get('/api/radar/warnings/layers', (req, res) => {
  console.log('[DEBUG] Radar warnings layers endpoint hit');
  try {
    const now = Date.now();
    
    // Get radar times (use cached if available)
    let radarTimes;
    if (radarTimesCache.data && radarTimesCache.timestamp && (now - radarTimesCache.timestamp < radarTimesCache.ttl)) {
      radarTimes = radarTimesCache.data;
      console.log('[DEBUG] Using cached radar times for layers');
    } else {
      radarTimes = generateRadarTimes();
      console.log('[DEBUG] Generated fresh radar times for layers:', radarTimes.length);
      radarTimesCache = {
        data: radarTimes,
        timestamp: now,
        ttl: radarTimesCache.ttl
      };
    }
    
    // Generate layer information for all times
    const layers = radarTimes.map(timeObj => ({
      timestamp: timeObj.timestamp,
      display: timeObj.display,
      datetime: timeObj.datetime,
      layerConfig: createRadarLayerUrl(timeObj.timestamp)
    }));
    
    console.log('[DEBUG] Generated', layers.length, 'radar layers');
    
    res.json({
      times: radarTimes,
      layers: layers,
      totalLayers: layers.length
    });
  } catch (error) {
    console.error('Error generating radar layers:', error);
    res.status(500).json({ error: 'Failed to generate radar layers' });
  }
});

// Get specific radar layer information
app.get('/api/radar/warnings/layers/:timestamp', (req, res) => {
  try {
    const { timestamp } = req.params;
    
    // Validate timestamp format (ISO 8601)
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid timestamp format' });
    }
    
    // Create layer info for the specific timestamp
    const layerInfo = {
      timestamp: timestamp,
      display: date.toLocaleTimeString('en-US', {
        timeZone: 'America/Chicago',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }) + ' CT',
      datetime: date,
      layerConfig: createRadarLayerUrl(timestamp)
    };
    
    res.json(layerInfo);
  } catch (error) {
    console.error('Error generating specific radar layer:', error);
    res.status(500).json({ error: 'Failed to generate radar layer' });
  }
});

// --- Start the Express Server ---
server.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
