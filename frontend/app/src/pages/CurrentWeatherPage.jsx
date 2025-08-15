import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useWeather } from '../context/WeatherContext';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import HourlyForecastChart from '../components/HourlyForecastChart';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { AspectRatio } from '@/components/ui/aspect-ratio';

const CurrentWeatherPage = () => {
  const [inputZipcode, setInputZipcode] = useState('');
  const { weatherData, locationName, loading, error, fetchWeatherData, setHomeLocation, zipcode } = useWeather();
  const { homeZip } = useAuth();

  // SPC State Outlook derivation
  const [spcState, setSpcState] = useState(null);
  const [spcUrl, setSpcUrl] = useState(null);
  const [spcFallback, setSpcFallback] = useState(false);
  const [spcLoading, setSpcLoading] = useState(false);
  // Additional SPC hazard images (derived from same state)
  const [spcTorUrl, setSpcTorUrl] = useState(null);
  const [spcWindUrl, setSpcWindUrl] = useState(null);
  const [spcHailUrl, setSpcHailUrl] = useState(null);
  const [hideTor, setHideTor] = useState(false);
  const [hideWind, setHideWind] = useState(false);
  const [hideHail, setHideHail] = useState(false);

  // UI state for compact toggles
  const [spcView, setSpcView] = useState('all'); // 'all' | 'tor' | 'wind' | 'hail'
  const [hourRange, setHourRange] = useState(12); // 12h or 24h

  const handleSearch = () => {
    fetchWeatherData(inputZipcode);
  };

  // Save inputZipcode if provided, else fall back to the currently viewed zipcode
  const handleSetHome = async () => {
    const toSave = (inputZipcode || zipcode || '').trim();
    if (!toSave) {
      alert('Enter a zipcode or search first before setting home.');
      return;
    }
    try {
      await setHomeLocation(toSave);
      alert('Home location has been set!');
    } catch {
      alert('Failed to set home location. Please try again.');
    }
  };

  const formatTime = (timestamp) => new Date(timestamp * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const formatDate = (timestamp) => new Date(timestamp * 1000).toLocaleDateString([], { weekday: 'short' });

  // Resolve user's state from zip and build SPC Day 1 image URL
  useEffect(() => {
    const activeZip = (zipcode || homeZip || '').trim();
    setSpcFallback(false);
    if (!activeZip || activeZip.length < 5) {
      setSpcState(null);
      setSpcUrl(null);
      setSpcTorUrl(null);
      setSpcWindUrl(null);
      setSpcHailUrl(null);
      setHideTor(false);
      setHideWind(false);
      setHideHail(false);
      return;
    }
    let cancelled = false;
    async function run() {
      try {
        setSpcLoading(true);
        const resp = await fetch(`/api/utils/zip-to-state?zip=${encodeURIComponent(activeZip)}`);
        if (!resp.ok) throw new Error('zip-to-state failed');
        const json = await resp.json();
        if (cancelled) return;
        const st = String(json.state || '').toUpperCase();
        setSpcState(st);
        // cache-busting param keeps image fresh
        const ts = Date.now();
        setSpcUrl(`https://www.spc.noaa.gov/partners/outlooks/state/images/${st}_swody1.png?${ts}`);
        setSpcTorUrl(`https://www.spc.noaa.gov/partners/outlooks/state/images/${st}_swody1_TORN.png?${ts}`);
        setSpcWindUrl(`https://www.spc.noaa.gov/partners/outlooks/state/images/${st}_swody1_WIND.png?${ts}`);
        setSpcHailUrl(`https://www.spc.noaa.gov/partners/outlooks/state/images/${st}_swody1_HAIL.png?${ts}`);
        // reset error-hiding flags on state change
        setHideTor(false);
        setHideWind(false);
        setHideHail(false);
      } catch (e) {
        if (!cancelled) {
          setSpcState(null);
          setSpcUrl(null);
          setSpcTorUrl(null);
          setSpcWindUrl(null);
          setSpcHailUrl(null);
          setSpcFallback(true);
        }
      } finally {
        if (!cancelled) setSpcLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [zipcode, homeZip]);

  return (
    <motion.div 
      className="p-4 sm:p-6 md:p-8 text-foreground"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-3 mb-6 backdrop-blur bg-background/40 border-b border-border">
        <div className="mx-auto max-w-6xl w-full flex flex-wrap items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-semibold mr-auto min-w-0 truncate">Today's Outlook{locationName ? ` – ${locationName}` : ''}</h1>
          <div className="flex w-full sm:w-auto min-w-0 items-center gap-2">
            <Input
              type="text"
              placeholder="Enter Zipcode..."
              value={inputZipcode}
              onChange={(e) => setInputZipcode(e.target.value)}
              className="bg-input border-border text-foreground flex-1 min-w-0"
            />
            <Button onClick={handleSearch} disabled={loading} className="whitespace-nowrap">
              {loading ? 'Searching...' : 'Get Weather'}
            </Button>
            <Button onClick={handleSetHome} variant="outline" disabled={loading} className="whitespace-nowrap">
              Save as Home
            </Button>
          </div>
        </div>
      </div>

      {weatherData && (
        <div className="space-y-6 mx-auto max-w-7xl">
          {/* Top row: Current grid (left) + SPC (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Current Weather</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <AspectRatio ratio={4/3} className="rounded-md overflow-hidden">
                    <div className="h-full w-full p-2 grid grid-cols-4 gap-1">
                {/* Now tile */}
                <Card className="aspect-square py-0 rounded-lg col-span-2 row-span-2">
                  <CardContent className="p-1 md:p-1.5 h-full flex flex-col items-center justify-center text-center">
                    <img
                      src={`https://openweathermap.org/img/wn/${weatherData.current.weather[0].icon}@2x.png`}
                      alt={weatherData.current.weather[0].description}
                      className="w-9 h-9 md:w-10 md:h-10 mb-1"
                    />
                    <p className="text-xl md:text-2xl font-extrabold leading-none tracking-tight">{Math.round(weatherData.current.temp)}°F</p>
                    <p className="capitalize mt-1 text-[9px] md:text-[10px] text-muted-foreground truncate">{weatherData.current.weather[0].description}</p>
                  </CardContent>
                </Card>

                {/* Metrics */}
                <Card className="aspect-square py-0 rounded-lg">
                  <CardContent className="p-1 h-full flex flex-col items-center justify-center text-center">
                    <p className="text-[9px] text-muted-foreground">Wind</p>
                    <p className="text-xs md:text-sm font-semibold">{weatherData.current.wind_speed} mph</p>
                  </CardContent>
                </Card>
                <Card className="aspect-square py-0 rounded-lg">
                  <CardContent className="p-1 h-full flex flex-col items-center justify-center text-center">
                    <p className="text-[9px] text-muted-foreground">Humidity</p>
                    <p className="text-xs md:text-sm font-semibold">{weatherData.current.humidity}%</p>
                  </CardContent>
                </Card>
                <Card className="aspect-square py-0 rounded-lg">
                  <CardContent className="p-1 h-full flex flex-col items-center justify-center text-center">
                    <p className="text-[9px] text-muted-foreground">UV Index</p>
                    <p className="text-xs md:text-sm font-semibold">{weatherData.current.uvi}</p>
                  </CardContent>
                </Card>
                <Card className="aspect-square py-0 rounded-lg">
                  <CardContent className="p-1 h-full flex flex-col items-center justify-center text-center">
                    <p className="text-[9px] text-muted-foreground">Dew Point</p>
                    <p className="text-xs md:text-sm font-semibold">{Math.round(weatherData.current.dew_point)}°F</p>
                  </CardContent>
                </Card>
                <Card className="aspect-square py-0 rounded-lg">
                  <CardContent className="p-1 h-full flex flex-col items-center justify-center text-center">
                    <p className="text-[9px] text-muted-foreground">Pressure</p>
                    <p className="text-xs md:text-sm font-semibold">{weatherData.current.pressure} hPa</p>
                  </CardContent>
                </Card>
                <Card className="aspect-square py-0 rounded-lg">
                  <CardContent className="p-1 h-full flex flex-col items-center justify-center text-center">
                    <p className="text-[9px] text-muted-foreground">Visibility</p>
                    <p className="text-xs md:text-sm font-semibold">{(weatherData.current.visibility / 1609).toFixed(1)} mi</p>
                  </CardContent>
                </Card>

                {/* Sunrise */}
                <Card className="aspect-square py-0 rounded-lg">
                  <CardContent className="p-1 h-full flex flex-col items-center justify-center text-center">
                    <p className="text-[9px] text-muted-foreground">Sunrise</p>
                    <p className="text-xs md:text-sm font-semibold">{formatTime(weatherData.current.sunrise)}</p>
                  </CardContent>
                </Card>
                {/* Sunset */}
                <Card className="aspect-square py-0 rounded-lg">
                  <CardContent className="p-1 h-full flex flex-col items-center justify-center text-center">
                    <p className="text-[9px] text-muted-foreground">Sunset</p>
                    <p className="text-xs md:text-sm font-semibold">{formatTime(weatherData.current.sunset)}</p>
                  </CardContent>
                </Card>

                    </div>
                  </AspectRatio>
                </CardContent>
              </Card>
            </div>

            {/* SPC right column */}
            <div>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-xl">SPC Day 1 {spcState ? `– ${spcState}` : ''}</CardTitle>
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant={spcView==='all' ? 'default' : 'outline'} onClick={() => setSpcView('all')}>All</Button>
                      <Button size="sm" variant={spcView==='tor' ? 'default' : 'outline'} onClick={() => setSpcView('tor')}>Tornado</Button>
                      <Button size="sm" variant={spcView==='wind' ? 'default' : 'outline'} onClick={() => setSpcView('wind')}>Wind</Button>
                      <Button size="sm" variant={spcView==='hail' ? 'default' : 'outline'} onClick={() => setSpcView('hail')}>Hail</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <AspectRatio ratio={4/3} className="rounded-md bg-muted/20 overflow-hidden">
                    <div className="h-full w-full p-2">
                      {spcLoading ? (
                        <div className="text-sm text-muted-foreground">Loading state outlook...</div>
                      ) : (
                        <div className="w-full h-full">
                          {(spcFallback || !spcUrl) ? (
                            <Carousel className="w-full h-full">
                              <CarouselContent>
                                <CarouselItem className="h-full">
                                  <div className="h-full w-full">
                                    <img
                                      src={`https://www.spc.noaa.gov/products/outlook/day1otlk.gif?${Date.now()}`}
                                      alt="SPC Day 1 Outlook (National)"
                                      className="h-full w-full object-contain"
                                      loading="eager"
                                    />
                                  </div>
                                </CarouselItem>
                              </CarouselContent>
                              <CarouselPrevious className="left-2 z-20 h-9 w-9 rounded-full bg-black/70 text-white border border-white/20" />
                              <CarouselNext className="right-2 z-20 h-9 w-9 rounded-full bg-black/70 text-white border border-white/20" />
                            </Carousel>
                          ) : (
                            <img
                              src={(spcView==='tor' && spcTorUrl) ? spcTorUrl : (spcView==='wind' && spcWindUrl) ? spcWindUrl : (spcView==='hail' && spcHailUrl) ? spcHailUrl : spcUrl}
                              alt={`SPC Day 1 Outlook${spcState ? ` for ${spcState}` : ''}`}
                              className="h-full w-full object-contain"
                              onError={() => setSpcFallback(true)}
                              loading="eager"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </AspectRatio>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom row: Hourly + 7-Day */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Hourly Forecast</CardTitle>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant={hourRange===12 ? 'default' : 'outline'} onClick={() => setHourRange(12)}>12h</Button>
                    <Button size="sm" variant={hourRange===24 ? 'default' : 'outline'} onClick={() => setHourRange(24)}>24h</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <HourlyForecastChart data={weatherData.hourly.slice(0, hourRange)} height={220} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">7-Day Forecast</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-border">
                  {weatherData.daily.map((day, index) => (
                    <div key={index} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0 truncate">{formatDate(day.dt)}</span>
                      <img src={`https://openweathermap.org/img/wn/${day.weather[0].icon}.png`} alt={day.weather[0].description} className="w-5 h-5" />
                      <span className="whitespace-nowrap font-medium">{Math.round(day.temp.max)}° / {Math.round(day.temp.min)}°</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          
        </div>
      )}
    </motion.div>
  );
};

export default CurrentWeatherPage;
