// src/pages/HomePage.jsx
import React from 'react';
import { motion } from 'framer-motion';
import LightningStormPro from '../components/LightningStormPro';
import GlowingCard from '../components/ui/GlowingCard';

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
          <GlowingCard
            hero
            className="w-full"
            title="Impact Weather"
            description="Your central hub for comprehensive weather intelligence. Stay informed. Stay ahead."
            to="/current-weather"
            ctaText="Let's Go!"
          />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
