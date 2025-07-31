import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, WMSTileLayer, GeoJSON } from 'react-leaflet';

import * as LEsri from 'esri-leaflet';
import { createLayerComponent } from '@react-leaflet/core';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import LsrLegend from '../components/LsrLegend'; // Adjust path if LsrLegend is elsewhere
import SpcLegend from '../components/SpcLegend';
import MapControls from '../components/MapControls';
import AtmosXAlertsLayer from '../components/AtmosXAlertsLayer';
import IEMRadarLayer from '../components/IEMRadarLayer';
import RadarTimeSlider from '../components/RadarTimeSlider';
import FutureRadarLayer from '../components/FutureRadarLayer';
import FutureRadarTimeSlider from '../components/FutureRadarTimeSlider';
import SPCKMLLayer from '../components/SPCKMLLayer';
import WarningCountDisplay from '../components/WarningCountDisplay';


// Helper component to adjust map view based on alert geometry
function MapController({ alertGeometry }) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      const popupPane = map.getPane('popupPane');
      if (popupPane) {
        popupPane.style.zIndex = 1000; // Ensure popups are above other layers
      }
    }
  }, [map]);

  // Existing useEffect for alertGeometry follows
  useEffect(() => {
    const currentGeometry = alertGeometry;
    if (currentGeometry && map) {
      if (currentGeometry.type === 'Polygon' && currentGeometry.coordinates && currentGeometry.coordinates[0]) {
        const polygonRing = currentGeometry.coordinates[0];
        if (Array.isArray(polygonRing) && polygonRing.length > 0 &&
            polygonRing.every(coord => Array.isArray(coord) && coord.length === 2 &&
                                     typeof coord[0] === 'number' && typeof coord[1] === 'number')) {
          try {
            map.fitBounds(polygonRing);
          } catch (e) {
            console.error('MapController: Error calling fitBounds for Polygon:', e);
          }
        } else {
          console.error('MapController: Invalid polygonRing for fitBounds:', polygonRing);
        }
      } else if (currentGeometry.type === 'Point' && currentGeometry.coordinates && currentGeometry.coordinates.length === 2) {
        const circleCenter = [currentGeometry.coordinates[1], currentGeometry.coordinates[0]]; // Leaflet expects [lat, lng]
        const radius = currentGeometry.radius || 10000; // Default radius if not provided
        if (typeof circleCenter[0] === 'number' && typeof circleCenter[1] === 'number') {
          try {
            map.setView(circleCenter, map.getBoundsZoom(L.circle(circleCenter, radius).getBounds()));
          } catch (e) {
            console.error('MapController: Error calling setView for Circle:', e);
          }
        } else {
          console.error('MapController: Invalid circleCenter for setView:', circleCenter);
        }
      }
    }
  }, [map, alertGeometry]);

  return null; // This component does not render anything itself
}

const getLsrIcon = (feature) => {
  // Use pre-processed icon information from backend
  const props = feature?.properties || {};
  

  
  const iconClass = props.iconClass || 'fas fa-circle-info';
  const color = props.iconColor || '#007bff';

  return L.divIcon({
    html: `<i class="${iconClass}" style="color: ${color}; font-size: 20px; text-shadow: 0 0 3px #000;"></i>`,
    className: 'lsr-custom-icon', // For any additional CSS if needed
    iconSize: [20, 20],
    iconAnchor: [10, 20], // Point of the icon which will correspond to marker's location
    popupAnchor: [0, -20] // Point from which the popup should open relative to the iconAnchor
  });
};

const pointToLayerLsr = (feature, latlng) => {
  return L.marker(latlng, { icon: getLsrIcon(feature) });
};

const onEachFeatureLsr = (feature, layer) => {
  if (feature.properties) {
    const props = feature.properties;
    let popupContent = `<div style="font-family: Arial, sans-serif; max-width: 280px;">`;
    popupContent += `<h4 style="margin-bottom: 5px; display: flex; align-items: center;"><span style="margin-right: 8px; font-size: 1.2em;">${getLsrIcon(props.descript).options.html}</span> ${props.descript || 'Local Storm Report'}</h4>`;
    
    if (props.lsr_validtime) {
      const date = new Date(props.lsr_validtime);
      const formattedTime = date.toLocaleString('en-US', {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
      });
      popupContent += `<p><strong>When:</strong> ${formattedTime}</p>`;
    }

    if (props.magnitude && String(props.magnitude).trim() !== "") {
      popupContent += `<p><strong>Magnitude:</strong> ${props.magnitude} ${props.units || ''}</p>`;
    }

    popupContent += `<p><strong>Location:</strong> ${props.loc_desc || 'N/A'}${props.state ? ', ' + props.state : ''}</p>`;
    
    if (props.remarks && String(props.remarks).trim() !== "") {
      popupContent += `<p><strong>Remarks:</strong> ${props.remarks}</p>`;
    }
    
    popupContent += `</div>`;
    layer.bindPopup(popupContent);
  }
};

// Custom component to add Esri DynamicMapLayer with React Leaflet hooks
// React-Leaflet compatible Esri FeatureLayer
// Esri FeatureLayer helper for generic url segment
const EsriFeatureLayer = (url, style) => createLayerComponent((props, ctx) => {
  const layer = LEsri.featureLayer({ url });
  return { instance: layer, context: ctx };
});

export function MapPage() {
  const [radarOpacity, setRadarOpacity] = useState(0.75);
  // Map layer selection state - single selection for all layers
  const [selectedLayer, setSelectedLayer] = useState('radar-warnings'); // 'radar-warnings', 'storm-reports', 'spc-outlooks'
  const [spcOutlookLayer, setSpcOutlookLayer] = useState('day1-categorical'); // Default to Day 1 Categorical
  
  // Separate visibility states for radar and warnings
  const [showRadar, setShowRadar] = useState(true);
  const [showWwa, setShowWwa] = useState(true);
  
  // State for alerts data
  const [alertsData, setAlertsData] = useState([]);

  // Helper function to get layer details from layer ID
  const getSpcLayerDetails = (layerId) => {
    const layerMap = {
      'day1-categorical': { type: 'categorical', day: 1, name: 'Day 1 Categorical' },
      'day1-tornado': { type: 'tornado', day: 1, name: 'Day 1 Tornado Prob' },
      'day1-hail': { type: 'hail', day: 1, name: 'Day 1 Hail Prob' },
      'day1-wind': { type: 'wind', day: 1, name: 'Day 1 Wind Prob' },
      'day2-categorical': { type: 'categorical', day: 2, name: 'Day 2 Categorical' },
      'day2-tornado': { type: 'tornado', day: 2, name: 'Day 2 Tornado Prob' },
      'day2-hail': { type: 'hail', day: 2, name: 'Day 2 Hail Prob' },
      'day2-wind': { type: 'wind', day: 2, name: 'Day 2 Wind Prob' },
      'day3-categorical': { type: 'categorical', day: 3, name: 'Day 3 Categorical' },
      'day3-probabilistic': { type: 'probabilistic', day: 3, name: 'Day 3 Probabilistic' },
      'day4-probabilistic': { type: 'probabilistic', day: 4, name: 'Day 4 Probabilistic' },
      'day5-probabilistic': { type: 'probabilistic', day: 5, name: 'Day 5 Probabilistic' },
      'day6-probabilistic': { type: 'probabilistic', day: 6, name: 'Day 6 Probabilistic' },
      'day7-probabilistic': { type: 'probabilistic', day: 7, name: 'Day 7 Probabilistic' },
      'day8-probabilistic': { type: 'probabilistic', day: 8, name: 'Day 8 Probabilistic' }
    };
    return layerMap[layerId] || { type: 'categorical', day: 1, name: 'Unknown' };
  };

  // Debug log for SPC layer changes
  useEffect(() => {
    // SPC Outlook Layer changed
  }, [spcOutlookLayer]);
  
  // Radar-specific state
  const [radarSelectedTime, setRadarSelectedTime] = useState(null);
  const [radarAvailableTimes, setRadarAvailableTimes] = useState([]);
  const [radarLoading, setRadarLoading] = useState(false);
  const [radarLooping, setRadarLooping] = useState(false);
  const loopIntervalRef = useRef(null);

  // Future radar state
  const [futureRadarForecastMinute, setFutureRadarForecastMinute] = useState(0);
  const [futureRadarModelRun, setFutureRadarModelRun] = useState(null);
  const [futureRadarLoading, setFutureRadarLoading] = useState(false);
  const [futureRadarError, setFutureRadarError] = useState(null);

  const [lsrData, setLsrData] = useState(null);
  const [spcData, setSpcData] = useState(null);
  const [spcLoading, setSpcLoading] = useState(false);
  const [spcError, setSpcError] = useState(null);

  // Derived states based on selection
  const showLsrLayer = selectedLayer === 'storm-reports';
  const showFutureRadar = selectedLayer === 'future-radar';
  const showSpcOutlooks = selectedLayer === 'spc-outlooks';
  
  // Update showRadar and showWwa to use the separate visibility states when on the radar-warnings layer
  const isRadarWarningsLayer = selectedLayer === 'radar-warnings';
  const effectiveShowRadar = isRadarWarningsLayer && showRadar;
  const effectiveShowWwa = isRadarWarningsLayer && showWwa;

  
  // Expose functions for IEM radar layer to communicate with parent
  useEffect(() => {
    window.setRadarTimes = (times) => {
      setRadarAvailableTimes(times);
      // Set initial time to the latest available
      if (times.length > 0 && !radarSelectedTime) {
        setRadarSelectedTime(times[times.length - 1].timestamp);
      }
    };
    
    window.setRadarLoading = (loading) => {
      setRadarLoading(loading);
    };
    
    return () => {
      delete window.setRadarTimes;
      delete window.setRadarLoading;
    };
  }, [radarSelectedTime]);

  const debounceTimerRef = useRef(null);
  const location = useLocation();
  const alertGeometry = location.state?.alertGeometry;

  // Clear alertGeometry from history state after first render to avoid persistence on refresh
  const navigate = useNavigate();
  useEffect(() => {
    if (location.state?.alertGeometry) {
      navigate('.', { replace: true, state: null });
    }
  }, []);

  // Approximate geographic center of contiguous USA
  const defaultUsaCenter = [39.8283, -98.5795];
  const initialZoom = 4; // Default zoom level

  // Default center
  const initialCenter = defaultUsaCenter;

  useEffect(() => {
    if (showLsrLayer && !lsrData) {
      // Fetching LSR data from backend
      fetch('/api/lsr/today')
        .then(response => {
          if (!response.ok) {
            throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then(data => {
          // Received processed LSR data from backend
          setLsrData(data);
        })
        .catch(error => {
          console.error('MapPage: Error fetching LSR data from backend:', error);
          // Fallback to empty data
          setLsrData({ type: 'FeatureCollection', features: [] });
        });
    } else if (selectedLayer !== 'storm-reports' && lsrData) {
      // Optional: Consider clearing data if layer is turned off and you want to re-fetch next time
      // Or to free up memory if features are very numerous.
      // console.log('MapPage: LSR layer turned off, optionally clear lsrData here.');
      // setLsrData(null); // Uncomment if you want to clear data on toggle off
    }
  }, [selectedLayer]);

  // SPC data fetching effect
  useEffect(() => {
    // SPC useEffect triggered
    
    if (showSpcOutlooks && spcOutlookLayer) {
      // Parse the layer ID to get outlook type and day
      const layerDetails = getSpcLayerDetails(spcOutlookLayer);
      const { type: outlookType, day } = layerDetails;
      
      // Layer details parsed and fetching SPC data
      
      // Clear previous data immediately to show loading state
      setSpcData(null);
      setSpcLoading(true);
      setSpcError(null);
      
      fetch(`/api/spc/${outlookType}/${day}`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then(data => {
          setSpcData(data);
          setSpcLoading(false);
        })
        .catch(error => {
          console.error('MapPage: Error fetching SPC data from backend:', error);
          setSpcError(error.message);
          setSpcData({ type: 'FeatureCollection', features: [] });
          setSpcLoading(false);
        });
    } else if (!showSpcOutlooks) {
      // Clear SPC data when layer is turned off
      // Clearing SPC data - layer turned off
      setSpcData(null);
      setSpcError(null);
      setSpcLoading(false);
    }
  }, [showSpcOutlooks, spcOutlookLayer]);

  const handleTimeChange = (newIndex, newTime) => {
    // Stop looping when user manually changes time
    if (radarLooping) {
      setRadarLooping(false);
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
        loopIntervalRef.current = null;
      }
    }
    
    // Update selected radar time
    setRadarSelectedTime(newTime);
  };

  const handleLoopToggle = (isLooping) => {
    setRadarLooping(isLooping);
    
    if (isLooping) {
      // Start looping animation
      loopIntervalRef.current = setInterval(() => {
        setRadarSelectedTime(currentTime => {
          if (!radarAvailableTimes.length) return currentTime;
          
          const currentIndex = radarAvailableTimes.findIndex(time => time.timestamp === currentTime);
          const nextIndex = currentIndex >= radarAvailableTimes.length - 1 ? 0 : currentIndex + 1;
          return radarAvailableTimes[nextIndex]?.timestamp || currentTime;
        });
      }, 800); // Change frame every 800ms
    } else {
      // Stop looping
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
        loopIntervalRef.current = null;
      }
    }
  };

  // Future radar callback functions
  const handleFutureRadarTimeChange = (minutes) => {
    setFutureRadarForecastMinute(minutes);
  };

  const handleFutureRadarModelRunChange = (modelRun, loading, error) => {
    setFutureRadarModelRun(modelRun);
    setFutureRadarLoading(loading);
    setFutureRadarError(error);
  };



  // Cleanup loop interval on unmount
  useEffect(() => {
    return () => {
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
      }
    };
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const legendItems = [
    { text: 'Rain', iconClass: 'fas fa-cloud-showers-heavy', color: '#4682B4' },
    { text: 'Hail', iconClass: 'fas fa-cloud-meatball', color: '#ADD8E6' },
    { text: 'Wind Event', iconClass: 'fas fa-wind', color: '#87CEEB' },
    { text: 'Funnel Cloud', iconClass: 'fas fa-tornado', color: '#FFA500' },
    { text: 'Tornado', iconClass: 'fas fa-tornado', color: '#FF0000' },
    { text: 'Flood/Flash Flood', iconClass: 'fas fa-water', color: '#0000FF' },
    { text: 'Debris Flow/Mudslide', iconClass: 'fas fa-house-flood-water', color: '#A0522D' },
    { text: 'Snow', iconClass: 'fas fa-snowflake', color: '#FFFFFF', textShadow: true },
    { text: 'Sleet/Freezing Rain', iconClass: 'fas fa-icicles', color: '#AFEEEE' },
    { text: 'Lightning', iconClass: 'fas fa-bolt', color: '#FFFF00', textShadow: true },
    { text: 'Other Report', iconClass: 'fas fa-circle-info', color: '#007bff' }
  ];

  return (
    <div className="container mx-auto p-4 flex flex-col h-full">
      <h1 className="text-2xl font-bold mb-4 shrink-0">Interactive Map</h1>

      <div className="relative flex-grow w-full h-[calc(100vh-200px)] rounded-lg shadow overflow-hidden">
        {/* Main Leaflet Map */}
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          {/* Mapbox Navigation Night Basemap */}
          <TileLayer
            key="mapbox-navigation-night"
            url="https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiemFjaG1pbGxlOTYiLCJhIjoiY200cmR2bXJ5MDNvbzJqb3F6dHQ0NDF6ZSJ9.ZbynfFycdWjRz1Bf-2iluQ"
            attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
            zIndex={1}
          />


          {/* IEM NEXRAD Radar */}
          <IEMRadarLayer
            isVisible={effectiveShowRadar}
            opacity={radarOpacity}
            selectedTime={radarSelectedTime}
            overlayType="radar"
          />


          {/* Future Radar Forecast */}
          {showFutureRadar && (
            <FutureRadarLayer
              isVisible={showFutureRadar}
              opacity={radarOpacity}
              forecastMinute={futureRadarForecastMinute}
              onModelRunChange={handleFutureRadarModelRunChange}
            />
          )}

          {/* AtmosphericX Weather Alerts */}
          {effectiveShowWwa && (
            <AtmosXAlertsLayer
              isVisible={true}
              onAlertsUpdate={setAlertsData}
            />
          )}



          {/* Local Storm Reports */}
          {showLsrLayer && (
            <MarkerClusterGroup
              iconCreateFunction={(cluster) => {
                const count = cluster.getChildCount();
                let size = 'small';
                if (count > 10) size = 'medium';
                if (count > 25) size = 'large';
                
                return L.divIcon({
                  html: `<div style="
                    background: rgba(0, 123, 255, 0.8);
                    border: 2px solid #ffffff;
                    border-radius: 50%;
                    color: white;
                    font-size: 11px;
                    font-weight: bold;
                    text-align: center;
                    line-height: ${size === 'small' ? '20px' : size === 'medium' ? '24px' : '28px'};
                    width: ${size === 'small' ? '20px' : size === 'medium' ? '24px' : '28px'};
                    height: ${size === 'small' ? '20px' : size === 'medium' ? '24px' : '28px'};
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                  ">${count}</div>`,
                  className: 'custom-cluster-icon',
                  iconSize: L.point(
                    size === 'small' ? 20 : size === 'medium' ? 24 : 28,
                    size === 'small' ? 20 : size === 'medium' ? 24 : 28
                  )
                });
              }}
              maxClusterRadius={40}
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
              zoomToBoundsOnClick={true}
            >
              <GeoJSON
                key={lsrData ? lsrData.features.length : 0}
                data={lsrData || { type: 'FeatureCollection', features: [] }}
                pointToLayer={pointToLayerLsr}
                onEachFeature={onEachFeatureLsr}
              />
            </MarkerClusterGroup>
          )}

          {/* SPC Weather Outlooks */}
          {showSpcOutlooks && spcData && (
            <GeoJSON
              key={`spc-outlook-${spcOutlookLayer}`}
              data={spcData}
              style={(feature) => {
                const props = feature?.properties || {};
                return {
                  color: props.strokeColor || '#3388ff',
                  weight: props.strokeWeight || 2,
                  opacity: props.strokeOpacity || 0.9,
                  fillColor: props.fillColor || '#87CEEB',
                  fillOpacity: props.fillOpacity || 0.3
                };
              }}
              onEachFeature={(feature, layer) => {
                const props = feature.properties || {};
                const { outlookType, day, layerName } = props;
                
                let popupContent = `<div style="font-family: Arial, sans-serif;">`;
                popupContent += `<h4 style="margin: 0 0 8px 0; color: #333;">${layerName || 'SPC Outlook'}</h4>`;
                
                // Add specific information based on outlook type
                if (outlookType === 'categorical') {
                  const risk = props.LABEL || props.DN || 'Unknown';
                  const description = props.LABEL2 || risk;
                  popupContent += `<p><strong>Risk Level:</strong> ${description}</p>`;
                  popupContent += `<p><strong>Code:</strong> ${risk}</p>`;
                } else {
                  const prob = props.LABEL || props.DN || 0;
                  popupContent += `<p><strong>Probability:</strong> ${prob}</p>`;
                }
                
                // Add timing information
                if (props.EXPIRE) {
                  popupContent += `<p><strong>Expires:</strong> ${props.EXPIRE}</p>`;
                }
                if (props.ISSUE) {
                  popupContent += `<p><strong>Issued:</strong> ${props.ISSUE}</p>`;
                }
                
                popupContent += `<p><strong>Source:</strong> NOAA/NWS Storm Prediction Center</p>`;
                popupContent += `</div>`;
                
                layer.bindPopup(popupContent);
              }}
              attribution="SPC/NOAA"
            />
          )}

          {/* Controller for zoom-to-alert functionality */}
          <MapController alertGeometry={alertGeometry} />
        </MapContainer>

        {/* Warning Count Display - now positioned within the map container */}
        <div className="absolute top-4 right-4 z-[1001]">
          <WarningCountDisplay alertsData={alertsData} />
        </div>
        
        {/* Legend */}
        {showLsrLayer && <LsrLegend items={legendItems} />}
        
        {/* SPC Legend */}
        {showSpcOutlooks && (
          <SpcLegend 
            layerId={spcOutlookLayer}
            layerName={getSpcLayerDetails(spcOutlookLayer).name}
          />
        )}
{/* Controls overlay */}
<MapControls
  selectedLayer={selectedLayer}
  setSelectedLayer={setSelectedLayer}
  spcOutlookLayer={spcOutlookLayer}
  setSpcOutlookLayer={setSpcOutlookLayer}
  showRadar={showRadar}
  setShowRadar={setShowRadar}
  showWwa={showWwa}
  setShowWwa={setShowWwa}
  positionClass="absolute top-4 left-1/2 transform -translate-x-1/2"
/>


        {/* Radar Time Slider - positioned outside map to avoid interaction conflicts */}
        {effectiveShowRadar && (
          <RadarTimeSlider
            radarTimes={radarAvailableTimes}
            selectedTime={radarSelectedTime}
            onTimeChange={handleTimeChange}
            isLoading={radarLoading}
            isLooping={radarLooping}
            onLoopToggle={handleLoopToggle}
            positionClass="absolute bottom-4 left-4"
          />
        )}

        {/* Future Radar Time Slider - positioned outside map to avoid interaction conflicts */}
        {showFutureRadar && (
          <FutureRadarTimeSlider
            forecastMinute={futureRadarForecastMinute}
            onTimeChange={handleFutureRadarTimeChange}
            modelRun={futureRadarModelRun}
            isLoading={futureRadarLoading}
            error={futureRadarError}
            positionClass="absolute bottom-4 left-4"
          />
        )}


      </div>
    </div>
  );
}
