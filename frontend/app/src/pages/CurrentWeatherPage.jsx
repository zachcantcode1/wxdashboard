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
      className="p-4 sm:p-6 md:p-8 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold mb-6">Today's Outlook</h1>
        <div className="flex w-full max-w-sm items-center space-x-2">
        <Input
          type="text"
          placeholder="Enter Zipcode..."
          value={inputZipcode}
          onChange={(e) => setInputZipcode(e.target.value)}
          className="bg-gray-700 border-gray-600 text-white"
        />
        <Button onClick={handleSearch} disabled={loading}>
            {loading ? 'Searching...' : 'Get Weather'}
        </Button>
        <Button onClick={handleSetHome} variant="outline" disabled={loading}>
            Save as Home
        </Button>
        </div>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {weatherData && (
        <div className="space-y-8">
          {/* Top row: Current Weather + SPC, side-by-side and squared */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Current Weather */}
          <Card className="bg-gray-800 border-gray-700 h-full">
            <CardHeader>
              <CardTitle className="text-2xl">Current Weather for {locationName}</CardTitle>
            </CardHeader>
            <CardContent>
              <AspectRatio ratio={16/9} className="rounded-md bg-black/20">
                <div className="h-full w-full p-4 md:p-6 overflow-hidden">
                  <div className="flex h-full w-full items-center justify-between gap-6 md:gap-8">
                    {/* Left: Icon + Temp */}
                    <div className="flex items-center space-x-6 md:space-x-10 basis-3/5 md:basis-2/3">
                      <div className="flex flex-col items-center">
                        <img
                          src={`https://openweathermap.org/img/wn/${weatherData.current.weather[0].icon}@2x.png`}
                          alt={weatherData.current.weather[0].description}
                          className="w-24 h-24 md:w-32 md:h-32"
                        />
                        <p className="capitalize mt-2 text-xs md:text-sm text-gray-300 whitespace-nowrap">{weatherData.current.weather[0].description}</p>
                      </div>
                      <div>
                        <p className="text-[8rem] md:text-[10rem] font-extrabold leading-none tracking-tight">{Math.round(weatherData.current.temp)}°F</p>
                      </div>
                    </div>

                    {/* Right: Stats list (vertical) */}
                    <div className="flex flex-col gap-1 text-xs md:text-sm lg:text-base text-gray-200 basis-2/5 md:basis-1/3 pl-8 md:pl-12">
                      <p><span className="text-gray-400">Feels like:</span> <span className="font-medium">{Math.round(weatherData.current.feels_like)}°F</span></p>
                      <p><span className="text-gray-400">Wind:</span> <span className="font-medium">{weatherData.current.wind_speed} mph</span></p>
                      <p><span className="text-gray-400">UV Index:</span> <span className="font-medium">{weatherData.current.uvi}</span></p>
                      <p><span className="text-gray-400">Humidity:</span> <span className="font-medium">{weatherData.current.humidity}%</span></p>
                      <p><span className="text-gray-400">Dew Point:</span> <span className="font-medium">{Math.round(weatherData.current.dew_point)}°F</span></p>
                      <p><span className="text-gray-400">Pressure:</span> <span className="font-medium">{weatherData.current.pressure} hPa</span></p>
                      <p><span className="text-gray-400">Visibility:</span> <span className="font-medium">{(weatherData.current.visibility / 1609).toFixed(1)} mi</span></p>
                    </div>
                  </div>
                </div>
              </AspectRatio>
            </CardContent>
          </Card>

          {/* SPC Day 1 State Outlook */}
          <Card className="bg-gray-800 border-gray-700 h-full">
            <CardHeader>
              <CardTitle>SPC Day 1 Outlook {spcState ? `for ${spcState}` : ''}</CardTitle>
            </CardHeader>
            <CardContent>
              <AspectRatio ratio={16/9} className="rounded-md bg-black/20 overflow-hidden">
                <div className="h-full w-full p-2 md:p-3">
                  {spcLoading ? (
                <div className="text-sm text-gray-300">Loading state outlook...</div>
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
                      <CarouselPrevious className="left-2 z-50 h-10 w-10 md:h-12 md:w-12 rounded-full bg-gray-900 text-white ring-2 ring-white/40 border border-white/30 shadow-xl transition-transform hover:scale-105 disabled:opacity-100 [&_svg]:size-7 md:[&_svg]:size-8" />
                      <CarouselNext className="right-2 z-50 h-10 w-10 md:h-12 md:w-12 rounded-full bg-gray-900 text-white ring-2 ring-white/40 border border-white/30 shadow-xl transition-transform hover:scale-105 disabled:opacity-100 [&_svg]:size-7 md:[&_svg]:size-8" />
                    </Carousel>
                  ) : (
                    <Carousel className="w-full h-full" opts={{ align: 'start', loop: false }}>
                      <CarouselContent>
                        {/* Primary state outlook slide */}
                        <CarouselItem className="h-full">
                          <div className="h-full w-full">
                            <img
                              src={spcUrl}
                              alt={`SPC Day 1 Outlook for ${spcState}`}
                              className="h-full w-full object-contain"
                              onError={() => setSpcFallback(true)}
                              loading="eager"
                            />
                          </div>
                        </CarouselItem>

                        {/* Hazard slides */}
                        {!hideTor && spcTorUrl && (
                          <CarouselItem className="h-full">
                            <div className="h-full w-full">
                              <img
                                src={spcTorUrl}
                                alt={`SPC Day 1 Tornado Outlook for ${spcState}`}
                                className="h-full w-full object-contain"
                                onError={() => setHideTor(true)}
                                loading="eager"
                              />
                            </div>
                          </CarouselItem>
                        )}
                        {!hideWind && spcWindUrl && (
                          <CarouselItem className="h-full">
                            <div className="h-full w-full">
                              <img
                                src={spcWindUrl}
                                alt={`SPC Day 1 Wind Outlook for ${spcState}`}
                                className="h-full w-full object-contain"
                                onError={() => setHideWind(true)}
                                loading="eager"
                              />
                            </div>
                          </CarouselItem>
                        )}
                        {!hideHail && spcHailUrl && (
                          <CarouselItem className="h-full">
                            <div className="h-full w-full">
                              <img
                                src={spcHailUrl}
                                alt={`SPC Day 1 Hail Outlook for ${spcState}`}
                                className="h-full w-full object-contain"
                                onError={() => setHideHail(true)}
                                loading="eager"
                              />
                            </div>
                          </CarouselItem>
                        )}
                      </CarouselContent>
                      <CarouselPrevious className="left-2 z-20 h-10 w-10 md:h-12 md:w-12 rounded-full bg-black/80 text-white border border-white/20 backdrop-blur-sm hover:bg-black/90 focus:ring-2 focus:ring-white/30 shadow-lg" />
                      <CarouselNext className="right-2 z-20 h-10 w-10 md:h-12 md:w-12 rounded-full bg-black/80 text-white border border-white/20 backdrop-blur-sm hover:bg-black/90 focus:ring-2 focus:ring-white/30 shadow-lg" />
                    </Carousel>
                  )}
                </div>
                )}
                </div>
              </AspectRatio>
            </CardContent>
          </Card>
          </div>

          {/* Hourly Forecast Chart */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>Hourly Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <HourlyForecastChart data={weatherData.hourly.slice(0, 24)} />
            </CardContent>
          </Card>

          {/* Daily Forecast */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>7-Day Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              {weatherData.daily.map((day, index) => (
                <div key={index} className="flex justify-between items-center p-2 border-b border-gray-700 last:border-b-0">
                  <p className="w-1/4">{formatDate(day.dt)}</p>
                  <div className="w-1/4 flex items-center">
                    <img src={`http://openweathermap.org/img/wn/${day.weather[0].icon}.png`} alt={day.weather[0].description} className="w-8 h-8 mr-2" />
                    <span className="hidden md:inline">{day.weather[0].main}</span>
                  </div>
                  <p className="w-1/4 text-right">{Math.round(day.temp.max)}° / {Math.round(day.temp.min)}°</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  );
};

export default CurrentWeatherPage;

