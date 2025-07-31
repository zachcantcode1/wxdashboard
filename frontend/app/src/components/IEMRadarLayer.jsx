import React, { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * IEMRadarLayer - Displays NEXRAD radar imagery from Iowa State University
 * Uses backend API for radar times and layer data, with caching and opacity-based transitions
 */
const IEMRadarLayer = ({ isVisible = true, opacity = 0.7, selectedTime = null, overlayType = 'radar' }) => {
  const map = useMap();
  const [availableTimes, setAvailableTimes] = useState([]);
  const [layerData, setLayerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const layerCacheRef = useRef(new Map()); // Cache for radar layers
  const activeLayersRef = useRef(new Set()); // Track active layers on map
  const preloadQueueRef = useRef(new Set()); // Track layers being preloaded

  // Fetch radar times and layer data from backend
  const fetchRadarData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/radar/warnings/layers');
      if (!response.ok) {
        throw new Error(`Failed to fetch radar data: ${response.status}`);
      }
      
      const data = await response.json();
      setLayerData(data);
      setAvailableTimes(data.times || []);
    } catch (err) {
      console.error('Error fetching radar data:', err);
      setError(err.message);
      setAvailableTimes([]);
      setLayerData(null);
    } finally {
      setLoading(false);
    }
  };

  // Load radar data on component mount
  useEffect(() => {
    fetchRadarData();
  }, []);

  // Create a radar layer for a specific time using backend layer data
  const createRadarLayer = (layerInfo) => {
    if (!layerInfo || !layerInfo.layerConfig) {
      console.error('Invalid layer info or missing layerConfig:', layerInfo);
      return null;
    }
    
    const config = layerInfo.layerConfig;
    
    if (overlayType === 'sigtor' || overlayType === 'cape') {
      // Use imageOverlay for backend PNG overlays
      const bounds = [[20, -130], [55, -60]];
      const layer = L.imageOverlay(config.wmsUrl, bounds, {
        opacity: 0,
        zIndex: 200,
        interactive: false
      });
      layer.on('load', () => {
        // Layer loaded successfully
      });
      return layer;
    } else {
      // Use WMS for radar with backend-provided configuration
      const layer = L.tileLayer.wms(config.wmsUrl, {
        layers: config.layers,
        format: config.format,
        transparent: config.transparent,
        opacity: 0, // Start invisible
        time: config.time,
        version: config.version,
        crs: L.CRS[config.crs] || L.CRS.EPSG4326,
        attribution: config.attribution,
        zIndex: 200
      });
      layer.on('load', () => {
        // Layer loaded successfully
      });
      return layer;
    }
  };

  // Create a radar layer for a specific timestamp (fallback method)
  const createRadarLayerByTimestamp = async (timestamp) => {
    try {
      const response = await fetch(`/api/radar/warnings/layers/${encodeURIComponent(timestamp)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch layer data for timestamp: ${response.status}`);
      }
      
      const layerInfo = await response.json();
      return createRadarLayer(layerInfo);
    } catch (error) {
      console.error('Error creating radar layer by timestamp:', error);
      return null;
    }
  };

  // Preload radar layers with smart prioritization using backend data
  const preloadRadarLayers = async () => {
    if (!map || !layerData || !layerData.layers.length) return;

    setLoading(true);

    // Prioritize loading: current time first, then recent times, then all others
    const currentIndex = selectedTime 
      ? layerData.layers.findIndex(l => l.timestamp === selectedTime)
      : layerData.layers.length - 1;

    const priorityQueue = [];
    
    // Add current time first
    if (currentIndex >= 0) {
      priorityQueue.push(layerData.layers[currentIndex]);
    }
    
    // Add surrounding times (±5 frames) for immediate scrubbing responsiveness
    const surroundingRange = 5;
    for (let i = 1; i <= surroundingRange; i++) {
      if (currentIndex - i >= 0) {
        priorityQueue.push(layerData.layers[currentIndex - i]);
      }
      if (currentIndex + i < layerData.layers.length) {
        priorityQueue.push(layerData.layers[currentIndex + i]);
      }
    }
    
    // Add all remaining layers
    layerData.layers.forEach(layerInfo => {
      if (!priorityQueue.includes(layerInfo)) {
        priorityQueue.push(layerInfo);
      }
    });

    // Load layers in priority order
    for (let i = 0; i < priorityQueue.length; i++) {
      const layerInfo = priorityQueue[i];
      
      if (!layerCacheRef.current.has(layerInfo.timestamp) && !preloadQueueRef.current.has(layerInfo.timestamp)) {
        preloadQueueRef.current.add(layerInfo.timestamp);
        
        const layer = createRadarLayer(layerInfo);
        if (layer) {
          layerCacheRef.current.set(layerInfo.timestamp, layer);
          
          // Add to map but keep invisible
          layer.addTo(map);
        }
        
        // Shorter delay for priority layers, longer for background loading
        const delay = i < 11 ? 50 : 200; // Fast load first 11 (current + surrounding)
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Clean up preload queue
        preloadQueueRef.current.delete(layerInfo.timestamp);
        
        // Manage cache size to prevent memory issues
        manageCacheSize();
      }
    }
    
    setLoading(false);
  };

  // Start preloading when layer data is available
  useEffect(() => {
    if (layerData && layerData.layers.length > 0) {
      // Start preloading after a short delay
      setTimeout(() => {
        preloadRadarLayers();
      }, 1000);
    }
  }, [layerData, map]);

  // Memory management - limit cache size and clean up old layers
  const manageCacheSize = () => {
    const maxCacheSize = 50; // Limit to prevent memory issues
    if (layerCacheRef.current.size > maxCacheSize) {
      // Cache size exceeded, cleaning up oldest layers
      
      // Convert to array and sort by timestamp
      const entries = Array.from(layerCacheRef.current.entries())
        .sort((a, b) => new Date(a[0]) - new Date(b[0]));
      
      // Remove oldest layers
      const toRemove = entries.slice(0, entries.length - maxCacheSize);
      toRemove.forEach(([timestamp, layer]) => {
        if (map && map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
        layerCacheRef.current.delete(timestamp);
        activeLayersRef.current.delete(timestamp);
      });
      
      // Cleaned up old layers
    }
  };

  // Enhanced layer transition with on-demand loading fallback
  const transitionToLayer = async (targetTime) => {
    if (!map || !targetTime || !layerData) return;

    let targetLayer = layerCacheRef.current.get(targetTime);
    
    // If layer not cached, create it immediately (fallback)
    if (!targetLayer) {
      // Find layer info from backend data
      const layerInfo = layerData.layers.find(l => l.timestamp === targetTime);
      if (layerInfo) {
        targetLayer = createRadarLayer(layerInfo);
        if (targetLayer) {
          layerCacheRef.current.set(targetTime, targetLayer);
          targetLayer.addTo(map);
          manageCacheSize();
        }
      } else {
        // Fallback: fetch layer data from backend API
        targetLayer = await createRadarLayerByTimestamp(targetTime);
        if (targetLayer) {
          layerCacheRef.current.set(targetTime, targetLayer);
          targetLayer.addTo(map);
          manageCacheSize();
        }
      }
    }

    if (!targetLayer) return;

    // Hide currently visible layers instantly
    activeLayersRef.current.forEach(timestamp => {
      const layer = layerCacheRef.current.get(timestamp);
      if (layer) {
        layer.setOpacity(0);
      }
    });

    // Show target layer immediately
    targetLayer.setOpacity(opacity);
    
    // Update active layers tracking
    activeLayersRef.current.clear();
    activeLayersRef.current.add(targetTime);
  };

  // Handle layer visibility and opacity changes with smooth transitions
  useEffect(() => {
    if (!map || !availableTimes.length) return;

    if (isVisible && selectedTime) {
      // Use advanced transition for smooth scrubbing
      transitionToLayer(selectedTime);
    } else {
      // Hide all layers when radar is disabled
      layerCacheRef.current.forEach((layer) => {
        layer.setOpacity(0);
      });
      activeLayersRef.current.clear();
    }
  }, [map, isVisible, selectedTime, availableTimes]);

  // Handle global opacity changes
  useEffect(() => {
    if (!map || !isVisible) return;
    
    // Update opacity for currently active layers
    activeLayersRef.current.forEach(timestamp => {
      const layer = layerCacheRef.current.get(timestamp);
      if (layer) {
        layer.setOpacity(opacity);
      }
    });
  }, [opacity, map, isVisible]);

  // Cleanup layers when component unmounts
  useEffect(() => {
    return () => {
      // Cleaning up cached layers
      layerCacheRef.current.forEach((layer) => {
        if (map && map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      layerCacheRef.current.clear();
      activeLayersRef.current.clear();
      preloadQueueRef.current.clear();
    };
  }, [map]);

  // Expose available times and loading state for parent components
  useEffect(() => {
    if (availableTimes.length && window.setRadarTimes) {
      window.setRadarTimes(availableTimes);
    }
  }, [availableTimes]);

  useEffect(() => {
    if (window.setRadarLoading) {
      window.setRadarLoading(loading);
    }
  }, [loading]);

  return null;
};

export default IEMRadarLayer;
