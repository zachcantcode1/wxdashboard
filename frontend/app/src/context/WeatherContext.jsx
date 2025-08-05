import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const WeatherContext = createContext();

export function useWeather() {
  return useContext(WeatherContext);
}

export const WeatherProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [zipcode, setZipcode] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHomeLocation = async () => {
      if (user && token) {
        try {
          const response = await fetch('/api/user/home-location', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          if (response.ok && data.home_zipcode) {
            fetchWeatherData(data.home_zipcode);
          }
        } catch (err) {
          console.error("Could not fetch home location", err);
        }
      }
    };
    fetchHomeLocation();
  }, [user, token]);

  const fetchWeatherData = async (newZipcode) => {
    if (!newZipcode) {
      setError('Please enter a zipcode.');
      return;
    }

    // Prevent re-fetching for the same zipcode
    if (newZipcode === zipcode && weatherData) {
        return;
    }

    setLoading(true);
    setError(null);

    try {
      const geoResponse = await fetch(`/api/geocode/${newZipcode}`);
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
      setZipcode(newZipcode);

    } catch (err) {
      setError(err.message);
      setWeatherData(null);
      setLocationName('');
    } finally {
      setLoading(false);
    }
  };

  const setHomeLocation = async (homeZipcode) => {
    if (!token) return; // or handle error
    try {
      const response = await fetch('/api/user/home-location', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ zipcode: homeZipcode }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set home location');
      }
      // Optionally, show a success message to the user
      console.log('Home location set successfully!');
    } catch (err) {
      console.error('Error setting home location:', err);
      // Optionally, show an error message to the user
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
