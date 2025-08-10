// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WeatherProvider } from './context/WeatherContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage'; // Default export
import LsrListPage from './pages/LsrListPage'; // Default export
import ActiveAlertsPage from './pages/ActiveAlertsPage'; // Default export
import CurrentWeatherPage from './pages/CurrentWeatherPage'; // Default export
import TopStormReportsPage from './pages/TopStormReportsPage'; // Default export
import WeatherStatsPage from './pages/WeatherStatsPage'; // Default export
import OutlooksPage from './pages/OutlooksPage'; // Default export
import { LoginScreen } from './components/auth/LoginScreen';

function App() {
  return (
    <AuthProvider>
      <WeatherProvider>
        <Router>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              {/* Public routes */}
              <Route index element={<HomePage />} />
              <Route path="login" element={<LoginScreen />} />

              {/* Protected app routes */}
              <Route element={<ProtectedRoute />}>
                {/* Routes for Weather Services sub-pages */}
                <Route path="recent-lsr" element={<LsrListPage />} />
                <Route path="active-alerts" element={<ActiveAlertsPage />} />
                <Route path="current-weather" element={<CurrentWeatherPage />} />
                <Route path="top-storm-reports" element={<TopStormReportsPage />} />
                <Route path="weather-stats" element={<WeatherStatsPage />} />
                <Route path="outlooks" element={<OutlooksPage />} />
                {/* Add other routes here later */}
              </Route>
            </Route>
          </Routes>
        </Router>
      </WeatherProvider>
    </AuthProvider>
  );
}

export default App;
