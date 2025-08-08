// src/layouts/MainLayout.jsx
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopNavigation } from '@/components/TopNavigation';

const MainLayout = () => {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar (hidden on landing) */}
      {!isLanding && <TopNavigation />}

      {/* Main Content Area */}
      <main className={isLanding ? 'flex-1' : 'flex-1'}>
        <div className={isLanding ? 'max-w-full mx-auto p-0' : 'max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6'}>
          <Outlet />
        </div>
      </main>

      {/* Footer (hidden on landing) */}
      {!isLanding && (
        <footer className="bg-background border-t border-border mt-auto">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <p className="text-center text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Impact Weather. All rights reserved.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default MainLayout;
