import React, { useState } from 'react';
import { useWeather } from '../context/WeatherContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import HourlyForecastChart from '../components/HourlyForecastChart';

const CurrentWeatherPage = () => {
  const [inputZipcode, setInputZipcode] = useState('');
  const { weatherData, locationName, loading, error, fetchWeatherData, setHomeLocation, zipcode } = useWeather();

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

  return (
    <div className="p-4 sm:p-6 md:p-8 text-white">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold mb-6">Current & Forecast Weather</h1>
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
          {/* Current Weather */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-2xl">Current Weather for {locationName}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center space-x-4">
                    <img src={`http://openweathermap.org/img/wn/${weatherData.current.weather[0].icon}@2x.png`} alt={weatherData.current.weather[0].description} />
                    <div>
                        <p className="text-4xl font-bold">{Math.round(weatherData.current.temp)}°F</p>
                        <p className="capitalize">{weatherData.current.weather[0].description}</p>
                    </div>
                </div>
                <div>
                    <p><strong>Feels like:</strong> {Math.round(weatherData.current.feels_like)}°F</p>
                    <p><strong>UV Index:</strong> {weatherData.current.uvi}</p>
                </div>
                <div>
                    <p><strong>Wind:</strong> {weatherData.current.wind_speed} mph</p>
                    <p><strong>Humidity:</strong> {weatherData.current.humidity}%</p>
                    <p><strong>Visibility:</strong> {(weatherData.current.visibility / 1609).toFixed(1)} mi</p>
                </div>
            </CardContent>
          </Card>

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
    </div>
  );
};

export default CurrentWeatherPage;

