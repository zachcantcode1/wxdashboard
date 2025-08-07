import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Wind, Zap, Tornado, AlertTriangle, Clock, MapPin, Calendar } from 'lucide-react';

const SOCKET_SERVER_URL = import.meta.env.PROD 
  ? 'https://wxdashboard-production.up.railway.app' 
  : 'http://localhost:3001';

const stateAbbreviationsToNames = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  AS: 'American Samoa', DC: 'District of Columbia', FM: 'Federated States of Micronesia',
  GU: 'Guam', MH: 'Marshall Islands', MP: 'Northern Mariana Islands', PW: 'Palau',
  PR: 'Puerto Rico', VI: 'Virgin Islands'
};

// Helper function to get alert severity color
const getAlertSeverityColor = (productType) => {
  const type = productType?.toLowerCase() || '';
  
  if (type.includes('warning')) {
    return 'border-red-500 bg-red-950';
  } else if (type.includes('watch')) {
    return 'border-orange-500 bg-orange-950';
  } else if (type.includes('advisory')) {
    return 'border-yellow-500 bg-yellow-950';
  } else if (type.includes('statement')) {
    return 'border-blue-500 bg-blue-950';
  } else {
    return 'border-gray-500 bg-gray-950';
  }
};

// Helper function to get alert severity text color
const getAlertTextColor = (productType) => {
  switch (productType?.toLowerCase()) {
    case 'tornado warning':
      return 'text-red-100';
    case 'severe thunderstorm warning':
      return 'text-orange-100';
    case 'flash flood warning':
      return 'text-blue-100';
    case 'tornado watch':
      return 'text-yellow-100';
    case 'severe thunderstorm watch':
      return 'text-yellow-100';
    case 'flood warning':
      return 'text-blue-100';
    default:
      return 'text-gray-100';
  }
};

function getSeverityLevel(productType) {
  switch (productType?.toLowerCase()) {
    case 'tornado warning':
      return 'EXTREME';
    case 'severe thunderstorm warning':
      return 'SEVERE';
    case 'flash flood warning':
      return 'SEVERE';
    case 'tornado watch':
      return 'MODERATE';
    case 'severe thunderstorm watch':
      return 'MODERATE';
    case 'flood warning':
      return 'MODERATE';
    case 'special weather statement':
      return 'MINOR';
    case 'winter weather advisory':
      return 'MINOR';
    default:
      return 'UNKNOWN';
  }
};

// Helper function to check if alert is still active
const isAlertActive = (expiresTime) => {
  if (!expiresTime || expiresTime === 'N/A') return true;
  
  try {
    const expiryDate = new Date(expiresTime);
    const now = new Date();
    return expiryDate > now;
  } catch (error) {
    return true; // If we can't parse the date, assume it's still active
  }
};

// Helper function to format time
const formatTime = (timeString) => {
  if (!timeString || timeString === 'N/A') return 'N/A';
  
  try {
    const date = new Date(timeString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  } catch (error) {
    return timeString;
  }
};

// Build Weatherwise URL using alert coordinates and VTEC/WFO
function buildWeatherwiseUrl(alert) {
  try {
    // Extract WFO from VTEC-like string. Expect formats like:
    // - "KMHX-FA-Y-0044" (use first 4 chars => KMHX)
    // - "O.NEW.KRAX.SV.W.0123...." (use parts[2] => KRAX)
    let wfo = null;
    const rawVtec = alert?.vtecString || alert?.vtec || alert?.vtec_string || alert?.vtecstr || '';

    if (typeof rawVtec === 'string' && rawVtec.length >= 4) {
      if (rawVtec.includes('.')) {
        const parts = rawVtec.split('.');
        if (parts.length >= 3 && parts[2] && parts[2].length >= 4) {
          wfo = parts[2].substring(0, 4);
        }
      }
      if (!wfo) {
        wfo = rawVtec.substring(0, 4);
      }
    }

    // Fallback if not present on transformed DB alert: try backend camelCase alias
    if (!wfo && typeof alert?.office === 'string' && alert.office.length >= 4) {
      wfo = alert.office.substring(0, 4);
    }

    // Coordinates: prefer centroid if geometry polygon exists, else attempt provided lat/lon fields
    let lat = null;
    let lon = null;

    // Common field variations from backend DB
    if (typeof alert?.lat === 'number' && typeof alert?.lon === 'number') {
      lat = alert.lat;
      lon = alert.lon;
    } else if (typeof alert?.latitude === 'number' && typeof alert?.longitude === 'number') {
      lat = alert.latitude;
      lon = alert.longitude;
    }

    // Try to compute a simple centroid from polygon if no direct lat/lon
    if ((lat == null || lon == null) && alert?.geometry && alert.geometry.type === 'Polygon' && Array.isArray(alert.geometry.coordinates) && alert.geometry.coordinates.length > 0) {
      const ring = alert.geometry.coordinates[0]; // [[lon, lat], ...]
      if (Array.isArray(ring) && ring.length > 0) {
        let sumLat = 0;
        let sumLon = 0;
        let count = 0;
        for (const pair of ring) {
          if (Array.isArray(pair) && pair.length >= 2) {
            const [plon, plat] = pair;
            if (Number.isFinite(plat) && Number.isFinite(plon)) {
              sumLat += plat;
              sumLon += plon;
              count += 1;
            }
          }
        }
        if (count > 0) {
          lat = sumLat / count;
          lon = sumLon / count;
        }
      }
    }

    // If still missing, bail
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    // Default map zoom similar to example
    const zoom = 9.14;
    // Build URL; rt param uses WFO if available; if missing, omit it
    const base = `https://web.weatherwise.app/#map=${zoom.toFixed(2)}/${lat.toFixed(4)}/${lon.toFixed(4)}`;
    const rt = wfo ? `&rt=${encodeURIComponent(wfo)}` : '';
    const rp = `&rp=REF0`;
    return `${base}${rt}${rp}`;
  } catch {
    return null;
  }
}

const ActiveAlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = (alert) => {
    setSelectedAlert(alert);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAlert(null);
  };

  useEffect(() => {
    let isMounted = true;
    const socket = io(SOCKET_SERVER_URL);

    // Fetch existing alerts from API when component mounts
    const fetchExistingAlerts = async () => {
      try {
        const response = await fetch('/api/alerts');
        if (response.ok) {
          const existingAlerts = await response.json();
          if (isMounted) {
            setAlerts(existingAlerts);
          }
        } else {
          console.error('Failed to fetch existing alerts:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching existing alerts:', error);
        if (isMounted) {
          setError('Failed to load existing alerts');
        }
      }
    };

    socket.on('connect', () => {
      if (isMounted) {
        setLoading(false);
        setError(null);
        // Fetch existing alerts after connecting
        fetchExistingAlerts();
      }
    });

    socket.on('new-alert', (parsedAlert) => {
      if (isMounted) {
        setAlerts(prevAlerts => {
          // Remove any existing alert with the same ID to avoid duplicates
          const filteredAlerts = prevAlerts.filter(alert => alert.id !== parsedAlert.id);
          // Add new alert at the beginning (most recent first)
          return [parsedAlert, ...filteredAlerts];
        });
      }
    });

    socket.on('disconnect', () => {});

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      if (isMounted) {
        setError('Failed to connect to alert server');
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      socket.disconnect();
    };
  }, []);

  // Filter to show only active alerts
  const activeAlerts = alerts.filter(alert => isAlertActive(alert.expires));

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Connecting to alert server...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Could not load active alerts: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (activeAlerts.length === 0) {
    return <div className="container mx-auto p-4 text-center">No active weather alerts at this time.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <motion.h1 
        className="text-3xl font-bold mb-3 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Active Weather Alerts
      </motion.h1>
      <motion.div 
        className="space-y-2.5"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
      >
        <AnimatePresence>
          {activeAlerts.map((alert, index) => (
            <motion.div
              key={alert.id || alert.headline + alert.expires}
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: { 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 300,
                    damping: 24
                  }
                }
              }}
              whileHover={{ 
                scale: 1.02, 
                y: -4,
                transition: { type: "spring", stiffness: 400, damping: 17 }
              }}
              whileTap={{ scale: 0.98 }}
              layout
              onClick={() => handleCardClick(alert)}
              className="cursor-pointer"
            >
              <Card
                className={`${getAlertSeverityColor(alert.productType)} cursor-pointer`}
              >
            <CardHeader className="py-4">
              <div className="flex items-start justify-between gap-4">
                {/* Left: Title + area + meta stacked compactly */}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <CardTitle className={`text-sm leading-relaxed ${getAlertTextColor(alert.productType)} break-words`}>
                      {alert.producttype || 'Weather Alert'}
                    </CardTitle>
                  </div>
                  <CardDescription className="mt-1.5 text-[13px] leading-relaxed break-words">
                    {alert.affectedarea || 'Area not specified'}
                  </CardDescription>

                  {/* Meta line compact */}
                  <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-2.5 gap-y-1 text-[12px] leading-relaxed">
                    <span className="text-gray-300 break-words">
                      <span className="font-medium text-gray-200">Expires:</span> {formatTime(alert.expires)}
                    </span>
                    {alert.states && alert.states.length > 0 && (
                      <span className="text-gray-300 break-words">
                        <span className="font-medium text-gray-200">States:</span>{' '}
                        {alert.states
                          .map(state => stateAbbreviationsToNames[state.toUpperCase()] || state)
                          .join(', ')}
                      </span>
                    )}
                    {alert.population_formatted && (
                      <span className="text-blue-300 font-medium break-words">
                        <span className="font-medium">👥 Population Affected:</span> {alert.population_formatted}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Weather parameters + CTA button */}
                <div className="shrink-0 flex flex-col items-end gap-3">
                  {/* Weather parameters in tiny pills - stacked vertically */}
                  {(alert.max_wind_gust || alert.max_hail_size || alert.tornado_detection || alert.thunderstormDamageThreat) && (
                    <div className="flex flex-col items-end gap-1.5 text-[11px] leading-relaxed">
                      {alert.max_wind_gust && alert.max_wind_gust !== 'N/A' && alert.max_wind_gust !== null && alert.max_wind_gust.trim() !== '' && (
                        <span className="inline-flex items-center rounded-full bg-yellow-900/40 text-yellow-200 px-2 py-1 break-words">
                          🌪️ Winds: {alert.max_wind_gust}
                        </span>
                      )}
                      {alert.max_hail_size && alert.max_hail_size !== 'N/A' && alert.max_hail_size !== null && alert.max_hail_size.trim() !== '' && (
                        <span className="inline-flex items-center rounded-full bg-blue-900/40 text-blue-200 px-2 py-1 break-words">
                          🧊 Hail: {alert.max_hail_size}
                        </span>
                      )}
                      {alert.tornado_detection && alert.tornado_detection !== 'N/A' && alert.tornado_detection !== null && alert.tornado_detection.trim() !== '' && (
                        <span className="inline-flex items-center rounded-full bg-red-900/40 text-red-200 px-2 py-1 break-words">
                          🌪️ Tornado: {alert.tornado_detection}
                        </span>
                      )}
                      {alert.thunderstormDamageThreat && alert.thunderstormDamageThreat !== 'N/A' && alert.thunderstormDamageThreat !== null && alert.thunderstormDamageThreat.trim() !== '' && (
                        <span className="inline-flex items-center rounded-full bg-orange-900/40 text-orange-200 px-2 py-1 break-words">
                          ⚡ Threat: {alert.thunderstormDamageThreat}
                        </span>
                      )}
                    </div>
                  )}

                  {/* CTA button below parameters */}
                  {(() => {
                    const url = buildWeatherwiseUrl(alert);
                    return url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center h-8 px-3 rounded-md border border-blue-400/40 bg-blue-600/90 hover:bg-blue-500 text-white text-[12px] font-medium transition-colors shadow-sm whitespace-nowrap"
                        title="Open this alert on Weatherwise"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View on Weatherwise
                      </a>
                    ) : null;
                  })()}
                </div>
              </div>
            </CardHeader>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      
      {alerts.length > activeAlerts.length && (
        <motion.div 
          className="mt-5 text-center text-gray-400 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p>Showing {activeAlerts.length} active alerts ({alerts.length - activeAlerts.length} expired alerts hidden)</p>
        </motion.div>
      )}

      {/* Alert Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto">
          {selectedAlert && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <DialogHeader className="space-y-3">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <DialogTitle className={`text-xl font-bold ${getAlertTextColor(selectedAlert.productType)} flex items-center gap-2`}>
                      <AlertTriangle className="h-5 w-5" />
                      {selectedAlert.producttype || 'Weather Alert'}
                    </DialogTitle>
                    <DialogDescription className="text-base mt-2">
                      {selectedAlert.affectedarea || 'Area not specified'}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

            <div className="mt-6 space-y-6">
              {/* Alert Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Expires:</span>
                  <span>{formatTime(selectedAlert.expires)}</span>
                </div>
                {selectedAlert.states && selectedAlert.states.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">States:</span>
                    <span>
                      {selectedAlert.states
                        .map(state => stateAbbreviationsToNames[state.toUpperCase()] || state)
                        .join(', ')}
                    </span>
                  </div>
                )}
                {selectedAlert.issued && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Issued:</span>
                    <span>{formatTime(selectedAlert.issued)}</span>
                  </div>
                )}
                {selectedAlert.effective && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Effective:</span>
                    <span>{formatTime(selectedAlert.effective)}</span>
                  </div>
                )}
              </div>

              {/* Weather Parameters */}
              {(selectedAlert.wind || selectedAlert.hail || selectedAlert.tornado || selectedAlert.threat) && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Weather Parameters
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedAlert.wind && (
                      <motion.div 
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Wind className="h-6 w-6 mx-auto mb-1 text-blue-400" />
                        <p className="text-xs text-muted-foreground">Wind</p>
                        <p className="font-semibold text-blue-400">{selectedAlert.wind}</p>
                      </motion.div>
                    )}
                    {selectedAlert.hail && (
                      <motion.div 
                        className="p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg text-center"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <div className="h-6 w-6 mx-auto mb-1 bg-gray-400 rounded-full" />
                        <p className="text-xs text-muted-foreground">Hail</p>
                        <p className="font-semibold text-gray-400">{selectedAlert.hail}</p>
                      </motion.div>
                    )}
                    {selectedAlert.tornado && (
                      <motion.div 
                        className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Tornado className="h-6 w-6 mx-auto mb-1 text-red-400" />
                        <p className="text-xs text-muted-foreground">Tornado</p>
                        <p className="font-semibold text-red-400">{selectedAlert.tornado}</p>
                      </motion.div>
                    )}
                    {selectedAlert.threat && (
                      <motion.div 
                        className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-center"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-orange-400" />
                        <p className="text-xs text-muted-foreground">Threat</p>
                        <p className="font-semibold text-orange-400">{selectedAlert.threat}</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {/* Alert Description */}
              {selectedAlert.description && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Description</h3>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">
                      {selectedAlert.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Alert Instructions */}
              {selectedAlert.instruction && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Instructions</h3>
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">
                      {selectedAlert.instruction}
                    </p>
                  </div>
                </div>
              )}

              {/* External Link */}
              <div className="flex justify-center pt-4 border-t">
                {(() => {
                  const url = buildWeatherwiseUrl(selectedAlert);
                  return url ? (
                    <Button 
                      onClick={() => window.open(url, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on WeatherWise
                    </Button>
                  ) : (
                    <Button 
                      disabled
                      className="flex items-center gap-2 opacity-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Location not available
                    </Button>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActiveAlertsPage;
