import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const WeatherContext = createContext();

export function useWeather() {
  return useContext(WeatherContext);
}

export const WeatherProvider = ({ children }) => {
  const { user, homeZip, saveHomeZip } = useAuth();
  const [zipcode, setZipcode] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-fetch when user logs in and has a saved home zip
  useEffect(() => {
    if (user && homeZip) {
      fetchWeatherData(homeZip);
    }
    // If user logs out, clear weather state
    if (!user) {
      setZipcode('');
      setWeatherData(null);
      setLocationName('');
      setError(null);
    }
  }, [user, homeZip]);

  const fetchWeatherData = async (newZipcode) => {
    const newZip = (newZipcode || '').trim();
    if (!newZip) {
      setError('Please enter a zipcode.');
      return;
    }

    // Prevent re-fetching for the same zipcode
    if (newZip === zipcode && weatherData) {
        return;
    }

    setLoading(true);
    setError(null);

    try {
      const geoResponse = await fetch(`/api/geocode/${newZip}`);
      const geoData = await geoResponse.json();

      if (!geoResponse.ok) {
        throw new Error(geoData.error || 'Could not find location for the given zipcode.');
      }

      const { lat, lon, name } = geoData;

      const weatherResponse = await fetch(`/api/one-call-weather?lat=${lat}&lon=${lon}`);
      const newWeatherData = await weatherResponse.json();

      if (!weatherResponse.ok) {
        throw new Error(newWeatherData.error || 'Could not fetch weather data.');
      }

      setWeatherData(newWeatherData);
      setLocationName(name || 'Unknown Location');
      setZipcode(newZip);

    } catch (err) {
      setError(err.message);
      setWeatherData(null);
      setLocationName('');
    } finally {
      setLoading(false);
    }
  };

  // Persist user's home zip in Supabase user_metadata via AuthContext
  const setHomeLocation = async (homeZipcode) => {
    try {
      const trimmed = (homeZipcode || '').trim();
      if (!trimmed) {
        throw new Error('Zip is required');
      }
      const { error } = await saveHomeZip(trimmed);
      if (error) {
        throw error;
      }
      console.log('Home location set successfully!');
    } catch (err) {
      console.error('Error setting home location:', err);
    }
  };

  const value = {
    zipcode,
    weatherData,
    locationName,
    loading,
    error,
    fetchWeatherData,
    setHomeLocation,
  };

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
};
