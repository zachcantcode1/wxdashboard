import React, { useState, useEffect, useRef } from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';

const WarningCountDisplay = ({ alertsData = [] }) => {
  const [isFlashing, setIsFlashing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [groupedAlerts, setGroupedAlerts] = useState({});
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const containerRef = useRef(null);
  
  // Calculate the number of active warnings
  const warningCount = alertsData.length;
  
  // Handle flashing animation when warnings are active
  useEffect(() => {
    if (warningCount > 0) {
      setIsFlashing(true);
    } else {
      setIsFlashing(false);
    }
  }, [warningCount]);
  
  // Function to get warning type for grouping
  const getWarningType = (alertType) => {
    const type = alertType.toLowerCase();
    if (type.includes('tornado')) return 'tornado';
    if (type.includes('severe thunderstorm')) return 'severeThunderstorm';
    if (type.includes('flash flood')) return 'flashFlood';
    if (type.includes('special weather statement')) return 'specialWeatherStatement';
    return 'other';
  };
  
  // Function to get display name for warning type
  const getWarningTypeDisplayName = (type) => {
    switch (type) {
      case 'tornado': return 'Tornado Warnings';
      case 'severeThunderstorm': return 'Severe Thunderstorm Warnings';
      case 'flashFlood': return 'Flash Flood Warnings';
      case 'specialWeatherStatement': return 'Special Weather Statements';
      default: return 'Other Warnings';
    }
  };
  
  // Function to get priority for warning type headers
  const getWarningTypePriority = (type) => {
    switch (type) {
      case 'tornado': return 1;
      case 'severeThunderstorm': return 2;
      case 'flashFlood': return 3;
      case 'specialWeatherStatement': return 4;
      default: return 5;
    }
  };
  
  // Function to get priority for warning type styling
  const getWarningTypeStyle = (type) => {
    switch (type) {
      case 'tornado': return 'bg-red-500/20 text-red-300';
      case 'severeThunderstorm': return 'bg-orange-500/20 text-orange-300';
      case 'flashFlood': return 'bg-green-500/20 text-green-300';
      case 'specialWeatherStatement': return 'bg-blue-500/20 text-blue-300';
      default: return 'bg-muted/40 text-muted-foreground';
    }
  };

  // Extract key information from alert descriptions and group by type
  useEffect(() => {
    const grouped = {};
    
    // Process alerts and group them
    const processedAlerts = alertsData.map(alert => {
      const description = alert.description || '';
      const lines = description.split('\n');
      const fieldMap = {};
      
      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          if (key && value) {
            fieldMap[key.trim()] = value;
          }
        }
      });
      
      const warningType = getWarningType(alert.alertType || 'Weather Alert');
      
      return {
        alertType: alert.alertType || 'Weather Alert',
        warningType,
        description: alert.description || '',
        locations: fieldMap['Locations'] || 'N/A',
        issued: fieldMap['Issued'] || 'N/A',
        expires: fieldMap['Expires'] || 'N/A',
        windGusts: fieldMap['Wind Gusts'] || 'N/A',
        hailSize: fieldMap['Hail Size'] || 'N/A',
        damageThreat: fieldMap['Damage Threat'] || 'N/A',
        tornado: fieldMap['Tornado'] || 'N/A'
      };
    });
    
    // Group alerts by type
    processedAlerts.forEach(alert => {
      if (!grouped[alert.warningType]) {
        grouped[alert.warningType] = [];
      }
      grouped[alert.warningType].push(alert);
    });
    
    // Sort severe thunderstorm warnings to prioritize those with "considerable"
    if (grouped.severeThunderstorm) {
      grouped.severeThunderstorm.sort((a, b) => {
        const aHasConsiderable = a.description.toLowerCase().includes('considerable');
        const bHasConsiderable = b.description.toLowerCase().includes('considerable');
        
        // If one has "considerable" and the other doesn't, prioritize the one with "considerable"
        if (aHasConsiderable && !bHasConsiderable) return -1;
        if (!aHasConsiderable && bHasConsiderable) return 1;
        
        // Otherwise maintain original order
        return 0;
      });
    }
    
    setGroupedAlerts(grouped);
  }, [alertsData]);
  
  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    };
    
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);
  
  // Toggle expanded state
  const toggleExpanded = () => {
    if (warningCount > 0) {
      // Initialize all categories as collapsed when expanding
      if (!isExpanded) {
        const initialCollapsedState = {};
        Object.keys(groupedAlerts).forEach(type => {
          initialCollapsedState[type] = true;
        });
        setCollapsedCategories(initialCollapsedState);
      }
      setIsExpanded(!isExpanded);
    }
  };
  
  // Toggle collapsed state for a specific category
  const toggleCategory = (category) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  // Close expanded view
  const closeExpanded = () => {
    setIsExpanded(false);
  };
  
  // Get sorted warning types
  const getSortedWarningTypes = () => {
    return Object.keys(groupedAlerts).sort((a, b) => {
      return getWarningTypePriority(a) - getWarningTypePriority(b);
    });
  };
  
  return (
    <div
      ref={containerRef}
      className="relative"
    >
      {/* Compact view */}
      <div
        className={`flex items-center gap-2 bg-card/90 backdrop-blur-md rounded-lg px-3 py-2 shadow-lg border border-border cursor-pointer transition-all duration-300 hover:bg-card ${
          isExpanded ? 'opacity-0 scale-95 absolute' : 'opacity-100 scale-100'
        }`}
        onClick={toggleExpanded}
      >
        <div
          className={`w-3 h-3 rounded-full ${
            isFlashing
              ? 'bg-teal-500 animate-pulse'
              : 'bg-muted-foreground/50'
          }`}
        />
        
        <span className="text-sm font-medium text-foreground">
          {warningCount} {warningCount === 1 ? 'Warning' : 'Warnings'}
        </span>
      </div>
      
      {/* Expanded view */}
      {isExpanded && (
        <div
          className="absolute top-0 right-0 bg-card/95 backdrop-blur-md rounded-lg shadow-lg border border-border w-80 max-h-96 flex flex-col transition-all duration-300 ease-in-out z-[1001]"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-3 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">
              Active Warnings ({warningCount})
            </h3>
            <button
              onClick={closeExpanded}
              className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-muted/30"
              aria-label="Close warnings list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {/* Scrollable list */}
          <div className="overflow-y-auto flex-grow">
            {getSortedWarningTypes().map((warningType) => (
              <Collapsible
                key={warningType}
                open={!collapsedCategories[warningType]}
                onOpenChange={() => toggleCategory(warningType)}
              >
                {/* Warning type header */}
                <CollapsibleTrigger asChild>
                  <div className="bg-muted/50 px-3 py-2 border-b border-border cursor-pointer hover:bg-muted transition-colors">
                    <h4 className="font-semibold text-foreground flex items-center justify-between">
                      <span>{getWarningTypeDisplayName(warningType)}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getWarningTypeStyle(warningType)}`}>
                          {groupedAlerts[warningType].length}
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-4 w-4 transition-transform duration-200 ${collapsedCategories[warningType] ? '' : 'rotate-180'}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </h4>
                  </div>
                </CollapsibleTrigger>
                
                {/* Warning list for this type */}
                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                  {groupedAlerts[warningType].map((alert, index) => (
                    <div
                      key={index}
                      className="p-3 border-b border-border last:border-b-0 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <h5 className="font-medium text-foreground">{alert.alertType}</h5>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">{alert.locations}</p>
                      
                      <div className="mt-2 text-xs text-muted-foreground grid grid-cols-2 gap-1">
                        <div>
                          <span className="font-medium">Issued:</span> {alert.issued}
                        </div>
                        <div>
                          <span className="font-medium">Expires:</span> {alert.expires}
                        </div>
                        {alert.windGusts && alert.windGusts !== 'N/A' && (
                          <div>
                            <span className="font-medium">Wind Gusts:</span> {alert.windGusts}
                          </div>
                        )}
                        {alert.hailSize && alert.hailSize !== 'N/A' && (
                          <div>
                            <span className="font-medium">Hail Size:</span> {alert.hailSize}
                          </div>
                        )}
                        {alert.damageThreat && alert.damageThreat !== 'N/A' && (
                          <div>
                            <span className="font-medium">Damage Threat:</span> {alert.damageThreat}
                          </div>
                        )}
                        {alert.tornado && alert.tornado !== 'N/A' && (
                          <div>
                            <span className="font-medium">Tornado:</span> {alert.tornado}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WarningCountDisplay;