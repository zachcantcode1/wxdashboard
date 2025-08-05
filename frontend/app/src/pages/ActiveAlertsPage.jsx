import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const type = productType?.toLowerCase() || '';
  
  if (type.includes('warning')) {
    return 'text-red-300';
  } else if (type.includes('watch')) {
    return 'text-orange-300';
  } else if (type.includes('advisory')) {
    return 'text-yellow-300';
  } else if (type.includes('statement')) {
    return 'text-blue-300';
  } else {
    return 'text-gray-300';
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

function ActiveAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      <h1 className="text-3xl font-bold mb-6 text-center">Active Weather Alerts</h1>
      <div className="space-y-4">
        {activeAlerts.map((alert) => (
          <Card 
            key={alert.id || alert.headline + alert.expires} 
            className={`${getAlertSeverityColor(alert.productType)}`}
          >
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <CardTitle className={`text-lg ${getAlertTextColor(alert.productType)}`}>
                    {alert.producttype || 'Weather Alert'}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {alert.affectedarea || 'Area not specified'}
                  </CardDescription>
                </div>
                <div className="mt-2 md:mt-0 md:text-right space-y-1 text-sm">
                  {/* Display specific parameters if available */}
                  <div className="space-y-1 mb-2">
                    {alert.max_wind_gust && alert.max_wind_gust !== 'N/A' && alert.max_wind_gust !== null && alert.max_wind_gust.trim() !== '' && (
                      <p className="text-yellow-300 font-medium">
                        🌪️ Winds: {alert.max_wind_gust}
                      </p>
                    )}
                    {alert.max_hail_size && alert.max_hail_size !== 'N/A' && alert.max_hail_size !== null && alert.max_hail_size.trim() !== '' && (
                      <p className="text-blue-300 font-medium">
                        🧊 Hail: {alert.max_hail_size}
                      </p>
                    )}
                    {alert.tornado_detection && alert.tornado_detection !== 'N/A' && alert.tornado_detection !== null && alert.tornado_detection.trim() !== '' && (
                      <p className="text-red-300 font-medium">
                        🌪️ Tornado: {alert.tornado_detection}
                      </p>
                    )}
                    {alert.thunderstormDamageThreat && alert.thunderstormDamageThreat !== 'N/A' && alert.thunderstormDamageThreat !== null && alert.thunderstormDamageThreat.trim() !== '' && (
                      <p className="text-orange-300 font-medium">
                        ⚡ Threat: {alert.thunderstormDamageThreat}
                      </p>
                    )}
                  </div>
                  
                  <p className="text-gray-400">
                    <span className="font-medium">Expires:</span> {formatTime(alert.expires)}
                  </p>
                  {alert.states && alert.states.length > 0 && (
                    <p className="text-gray-400">
                      <span className="font-medium">States:</span> {
                        alert.states.map(state => 
                          stateAbbreviationsToNames[state.toUpperCase()] || state
                        ).join(', ')
                      }
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
      
      {alerts.length > activeAlerts.length && (
        <div className="mt-8 text-center text-gray-400">
          <p>Showing {activeAlerts.length} active alerts ({alerts.length - activeAlerts.length} expired alerts hidden)</p>
        </div>
      )}
    </div>
  );
}

export default ActiveAlertsPage;
