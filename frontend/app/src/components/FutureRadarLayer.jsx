import React, { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const FutureRadarLayer = ({ opacity = 0.7, isVisible = true, forecastMinute = 0, onModelRunChange }) => {
  const [modelRun, setModelRun] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [layerData, setLayerData] = useState(null);
  const map = useMap();
  const layerCacheRef = useRef(new Map()); // Cache for forecast layers
  const activeLayersRef = useRef(new Set()); // Track active layers on map

  // Fetch layer data from backend API
  const fetchLayerData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Notify parent component that loading started
      if (onModelRunChange) {
        onModelRunChange(null, true, null);
      }
      
      const response = await fetch('/api/radar/future/layers');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setLayerData(data);
      setModelRun(data.modelRun);
      
      // Notify parent component of model run change
      if (onModelRunChange) {
        onModelRunChange(data.modelRun, false, null);
      }
      
    } catch (err) {
      console.error('Failed to fetch layer data:', err);
      setError(err.message);
      
      // Notify parent component of error
      if (onModelRunChange) {
        onModelRunChange(null, false, err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Create a forecast layer using backend-provided tile URL
  const createForecastLayer = (layerInfo) => {
    // Validate layerInfo and tileUrl
    if (!layerInfo || !layerInfo.tileUrl) {
      console.error('Invalid layer info or missing tileUrl:', layerInfo);
      return null;
    }

    const layer = L.tileLayer(layerInfo.tileUrl, {
      attribution: '© Iowa Environmental Mesonet',
      opacity: 0, // Start invisible
      zIndex: 200,
      maxZoom: 18,
      transparent: true,
      format: 'image/png'
    });

    // Only add error handling, no excessive logging
    layer.on('tileerror', () => {
      console.warn('Failed to load tiles for forecast minute:', layerInfo.forecastMinute);
    });

    return layer;
  };

  // Preload forecast layers with smart prioritization using backend data
  const preloadForecastLayers = async () => {
    if (!map || !layerData || !layerData.layers.length) return;

    setLoading(true);

    // Prioritize loading: current forecast time first, then surrounding times
    const currentIndex = layerData.layers.findIndex(layer => layer.forecastMinute === forecastMinute);
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
      if (!priorityQueue.find(l => l.forecastMinute === layerInfo.forecastMinute)) {
        priorityQueue.push(layerInfo);
      }
    });

    // Load layers in priority order
    for (let i = 0; i < priorityQueue.length; i++) {
      const layerInfo = priorityQueue[i];
      
      if (!layerCacheRef.current.has(layerInfo.forecastMinute)) {
        const layer = createForecastLayer(layerInfo);
        
        // Only proceed if layer creation was successful
        if (layer) {
          layerCacheRef.current.set(layerInfo.forecastMinute, layer);
          
          // Add to map but keep invisible
          layer.addTo(map);
        }
        
        // Shorter delay for priority layers, longer for background loading
        const delay = i < 11 ? 50 : 200; // Fast load first 11 (current + surrounding)
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    setLoading(false);
  };

  // Fetch layer data from backend API
  useEffect(() => {
    fetchLayerData();
    
    // Refresh layer data every 30 minutes
    const interval = setInterval(fetchLayerData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []); // Empty dependency array - only run once on mount

  // Start preloading when layer data is available
  useEffect(() => {
    if (layerData) {
      // Check if this is a new model run
      const isNewModelRun = modelRun && layerData.modelRun && modelRun !== layerData.modelRun;
      
      if (isNewModelRun) {
        // Clear cache for new model run
        layerCacheRef.current.clear();
        activeLayersRef.current.clear();
      }
      
      // Start preloading after a short delay
      setTimeout(() => {
        preloadForecastLayers();
      }, 500);
    }
  }, [layerData, forecastMinute]);

  // Memory management - limit cache size
  const manageCacheSize = () => {
    const maxCacheSize = 50; // Limit to prevent memory issues
    if (layerCacheRef.current.size > maxCacheSize) {
      // Convert to array and sort by forecast minute
      const entries = Array.from(layerCacheRef.current.entries())
        .sort((a, b) => a[0] - b[0]);
      
      // Remove oldest layers
      const toRemove = entries.slice(0, entries.length - maxCacheSize);
      toRemove.forEach(([minutes, layer]) => {
        if (map && map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
        layerCacheRef.current.delete(minutes);
        activeLayersRef.current.delete(minutes);
      });
    }
  };

  // Enhanced layer transition with on-demand loading fallback
  const transitionToLayer = (targetMinutes) => {
    if (!map || typeof targetMinutes !== 'number' || !layerData) {
      return;
    }

    let targetLayer = layerCacheRef.current.get(targetMinutes);
    
    // If layer not cached, create it immediately (fallback)
    if (!targetLayer) {
      // Find the layer info from backend data
      const layerInfo = layerData.layers.find(layer => layer.forecastMinute === targetMinutes);
      
      if (layerInfo) {
        targetLayer = createForecastLayer(layerInfo);
        
        if (targetLayer) {
          layerCacheRef.current.set(targetMinutes, targetLayer);
          targetLayer.addTo(map);
          
          // Manage cache size
          manageCacheSize();
        } else {
          console.warn('Failed to create layer for forecast minute:', targetMinutes);
          return;
        }
      } else {
        console.warn('No layer info found for forecast minute:', targetMinutes);
        return;
      }
    }

    // Hide currently visible layers instantly
    activeLayersRef.current.forEach(minutes => {
      const layer = layerCacheRef.current.get(minutes);
      if (layer) {
        layer.setOpacity(0);
      }
    });

    // Show target layer immediately
    if (targetLayer) {
      targetLayer.setOpacity(opacity);
      
      // Update active layers tracking
      activeLayersRef.current.clear();
      activeLayersRef.current.add(targetMinutes);
    }
  };

  // Handle layer visibility and opacity changes with smooth transitions
  useEffect(() => {
    if (!map) return;



    if (isVisible && typeof forecastMinute === 'number') {
      // Use transition for smooth scrubbing
      transitionToLayer(forecastMinute);
    } else {
      // Hide all layers when forecast radar is disabled
      layerCacheRef.current.forEach((layer) => {
        layer.setOpacity(0);
      });
      activeLayersRef.current.clear();
    }
  }, [map, isVisible, forecastMinute, layerData]);

  // Handle global opacity changes
  useEffect(() => {
    if (!map || !isVisible) return;
    
    // Update opacity for currently active layers
    activeLayersRef.current.forEach(minutes => {
      const layer = layerCacheRef.current.get(minutes);
      if (layer) {
        layer.setOpacity(opacity);
      }
    });
  }, [opacity, map, isVisible]);

  // Cleanup layers when component unmounts
  useEffect(() => {
    return () => {
      console.log('[FutureRadarLayer] Cleaning up cached layers');
      layerCacheRef.current.forEach((layer) => {
        if (map && map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      layerCacheRef.current.clear();
      activeLayersRef.current.clear();
    };
  }, [map]);

  // Don't render anything - this is just a data layer
  return null;
};

export default FutureRadarLayer;
