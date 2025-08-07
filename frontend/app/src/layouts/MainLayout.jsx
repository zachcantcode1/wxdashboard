// src/layouts/MainLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavigation } from '@/components/TopNavigation';

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <TopNavigation />
      
      {/* Main Content Area */}
      <main className="flex-1">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-background border-t border-border mt-auto">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} WX DASHBOARD. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
