// src/App.jsx
import 'leaflet/dist/leaflet.css'; // Required for react-leaflet
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage'; // Default export
import { MapPage } from './pages/MapPage'; // Named export - RESTORED TO ORIGINAL
import { LiveCamsPage } from './pages/LiveCamsPage'; // Named export
import LsrListPage from './pages/LsrListPage'; // Default export
import ActiveAlertsPage from './pages/ActiveAlertsPage'; // Default export
import TopStormReportsPage from './pages/TopStormReportsPage'; // Default export

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          {/* Routes for Weather Services sub-pages */}

          <Route path="map" element={<MapPage />} />
          <Route path="live-cams" element={<LiveCamsPage />} />
          <Route path="recent-lsr" element={<LsrListPage />} />
          <Route path="active-alerts" element={<ActiveAlertsPage />} />
          <Route path="top-storm-reports" element={<TopStormReportsPage />} />

          {/* Add other routes here later */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
