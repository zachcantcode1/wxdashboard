# Weather Dashboard Codebase Reference

## Project Structure Overview

```
weatherdashboard/
├── backend/                    # Node.js/Express backend
│   ├── server.js              # Main server (ACTIVE)
│   ├── atmosxClient.js        # AtmosX NWWS parser client
│   ├── alertParser.js         # Alert parsing logic
│   ├── server-original.js     # Original XMPP-based server (UNUSED)
│   ├── server-atmosx.js       # Alternative AtmosX server (UNUSED)
│   ├── xmppClient.js          # Original XMPP client (LEGACY)
│   ├── debug-atmosx-alerts.js # Debug script
│   ├── examine-database.js    # Database examination script
│   ├── test-atmosx.js         # Test script
│   ├── downloadRadarImages.js # Radar image downloader
│   └── parserConfig.js        # Parser configuration
└── frontend/app/              # React frontend
    ├── src/
    │   ├── App.jsx            # Main app component with routing
    │   ├── main.jsx           # React entry point
    │   ├── pages/             # Page components
    │   ├── components/        # Reusable components
    │   ├── layouts/           # Layout components
    │   ├── contexts/          # React contexts
    │   ├── hooks/             # Custom hooks
    │   └── lib/               # Utility libraries
    └── vite.config.js         # Vite configuration with proxy
```

## Frontend to Backend Connection Map

### 1. Real-time Alert System (Socket.IO)
**Connection**: WebSocket connection on port 3001

**Backend Components:**
- `server.js` (lines 24-30, 65-72, 76): Sets up Socket.IO server
- `atmosxClient.js` (lines 75-140): Emits 'new-alert' events to connected clients

**Frontend Components:**
- `ActiveAlertsPage.jsx` (lines 97-134): Connects to Socket.IO, listens for 'new-alert' events
- `AlertsSidebar.jsx` (line 2, 37): Also connects to Socket.IO for real-time alerts

**Data Flow:**
1. AtmosX NWWS parser receives weather alerts
2. `atmosxClient.js` processes and transforms alerts
3. Transformed alerts emitted via Socket.IO as 'new-alert' events
4. Frontend components receive and display alerts in real-time

### 2. REST API Endpoints

**Backend Endpoints:**
- `GET /api/radar/:time` (server.js lines 33-44): Serves radar images from cache

**Frontend API Calls:**
- `MapContainer.jsx` (line 43): Fetches radar images via `/api/radar/${timeKey}`
- `MapContainer.jsx` (lines 45, 47): References `/api/sigtor/` and `/api/cape/` endpoints (NOT IMPLEMENTED in backend)
- `HRRRLayer.jsx` (line 60): Calls `/api/process-grib2` endpoint (NOT IMPLEMENTED in backend)

**Proxy Configuration:**
- `vite.config.js` (lines 24-26): Proxies `/api/*` requests to `http://localhost:3001`

### 3. Static File Serving
- Backend serves radar images from `radar_cache` directory
- Frontend accesses these via the `/api/radar/:time` endpoint

## Component Hierarchy and Connections

### Main App Structure
```
App.jsx
├── MainLayout (from layouts/)
    ├── HomePage
    ├── MapPage
    │   ├── MapContainer
    │   ├── AtmosXAlertsLayer
    │   ├── IEMRadarLayer
    │   ├── RadarTimeSlider
    │   ├── FutureRadarLayer
    │   ├── SPCKMLLayer
    │   └── WarningCountDisplay
    ├── ActiveAlertsPage (Socket.IO connection)
    ├── LiveCamsPage
    ├── LsrListPage
    └── TopStormReportsPage
```

### Key Component Functions

**MapPage.jsx** (142-564):
- Main map interface with multiple weather layers
- Integrates various weather data sources (radar, alerts, forecasts)
- Uses Leaflet for mapping functionality

**ActiveAlertsPage.jsx** (90-232):
- Real-time weather alert display
- Socket.IO connection for live updates
- Alert filtering and formatting

**AtmosXAlertsLayer.jsx**:
- Displays weather alerts on the map
- Connects to the AtmosX alert system

## Unused/Legacy Code Analysis

### Definitely Unused Files:
1. **`server-original.js`** - Original XMPP-based server implementation
   - Replaced by current `server.js` with AtmosX integration
   - Uses old `xmppClient.js` instead of `atmosxClient.js`

2. **`server-atmosx.js`** - Alternative AtmosX server implementation
   - Duplicate functionality of current `server.js`
   - Not referenced anywhere in the codebase

3. **`xmppClient.js`** - Original XMPP client
   - Legacy implementation replaced by AtmosX parser
   - Still present but not used by active server

### Debug/Development Files:
1. **`debug-atmosx-alerts.js`** - Debug script for AtmosX alerts
2. **`examine-database.js`** - Database examination utility
3. **`test-atmosx.js`** - Test script for AtmosX functionality

### Missing Backend Implementations:
The frontend references several API endpoints that are NOT implemented in the backend:
1. `/api/sigtor/:time` - Referenced in MapContainer.jsx but not implemented
2. `/api/cape/:time` - Referenced in MapContainer.jsx but not implemented  
3. `/api/process-grib2` - Referenced in HRRRLayer.jsx but not implemented

### Potentially Unused Frontend Components:
Several components in the `components/` directory may not be actively used:
- `WeatherActivityDisplay.jsx` (empty file)
- `WeatherActivityScore.jsx` (empty file)
- `WeatherActivityWidget.jsx` (empty file)
- `AtmosXAlertsLayerNew.jsx` - Newer version, unclear if replacing `AtmosXAlertsLayer.jsx`

## Data Flow Summary

### Alert Processing Flow:
1. **AtmosX NWWS Parser** → Receives raw weather alerts
2. **atmosxClient.js** → Processes and transforms alerts
3. **Socket.IO** → Broadcasts alerts to connected clients
4. **Frontend Components** → Display alerts in real-time

### Radar Data Flow:
1. **downloadRadarImages.js** → Downloads radar images (if used)
2. **File System** → Stores images in `radar_cache/`
3. **server.js** → Serves images via `/api/radar/:time`
4. **Frontend Map Components** → Display radar overlays

## Configuration Files

### Backend:
- `package.json` - Node.js dependencies
- `parserConfig.js` - Alert parser configuration

### Frontend:
- `package.json` - React/Vite dependencies
- `vite.config.js` - Development server and build configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `components.json` - UI component configuration

## Recommendations

1. **Remove unused server files**: `server-original.js`, `server-atmosx.js`, `xmppClient.js`
2. **Implement missing API endpoints** or remove frontend references to them
3. **Clean up empty component files** in the components directory
4. **Consolidate AtmosX alert layer components** if `AtmosXAlertsLayerNew.jsx` is the replacement
5. **Move debug scripts** to a separate `scripts/` or `tools/` directory

## Notes

- The application uses a hybrid approach: Socket.IO for real-time alerts and REST API for static resources
- Frontend is built with React + Vite, backend with Node.js + Express
- Weather data comes from AtmosX NWWS parser system
- Map functionality uses Leaflet with various weather data overlays
- The codebase shows signs of evolution from XMPP-based to AtmosX-based alert system
