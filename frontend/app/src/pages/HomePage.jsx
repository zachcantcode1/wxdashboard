// src/pages/HomePage.jsx
import React from 'react';
import { motion } from 'framer-motion';
import LightningStormPro from '../components/LightningStormPro';
import GetStartedButton from '../components/shsfui/button/GetStartedButton';

const HomePage = () => {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden">
      {/* Animated Gradient Background - CSS will be in index.css */}
      <div className="animated-gradient-bg absolute inset-0 -z-10 w-full h-full"></div>
      {/* Canvas-based lightning storm overlay */}
      <motion.div 
        className="absolute inset-0 z-0"
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        <LightningStormPro />
      </motion.div>
      <div className="z-10 text-center px-4 w-full">
        <div className="max-w-5xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <h1 className="text-white tracking-tight text-4xl md:text-5xl lg:text-6xl font-extrabold">
              Impact Weather
            </h1>
            <p className="mt-2 text-slate-300 text-base md:text-lg">
              Your central hub for comprehensive weather intelligence. Stay informed. Stay ahead.
            </p>
            <div className="mt-6">
              <GetStartedButton to="/login" size="lg">
                Let's Go!
              </GetStartedButton>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
