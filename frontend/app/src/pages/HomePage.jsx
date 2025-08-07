// src/pages/HomePage.jsx
import React from 'react';
import { motion } from 'framer-motion';
import LightningStormPro from '../components/LightningStormPro';

const HomePage = () => {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-200px)] overflow-hidden rounded-lg">
      {/* Animated Gradient Background - CSS will be in index.css */}
      <div className="animated-gradient-bg absolute inset-0 -z-10 w-full h-full rounded-lg"></div>
      {/* Canvas-based lightning storm overlay */}
      <motion.div 
        className="absolute inset-0 z-0"
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        <LightningStormPro />
      </motion.div>
      <div className="z-10 text-center px-4">
        <motion.h1 
          className="text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6"
          initial={{ opacity: 0, scale: 0.8, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ 
            duration: 0.8, 
            delay: 0.5,
            type: "spring",
            stiffness: 150,
            damping: 20
          }}
          whileHover={{ 
            scale: 1.05,
            textShadow: "0px 0px 20px rgba(255,255,255,0.8)",
            transition: { duration: 0.3 }
          }}
        >
          WX DASHBOARD
        </motion.h1>
        <motion.p 
          className="text-xl md:text-2xl text-gray-200 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.6, 
            delay: 0.8,
            ease: "easeOut"
          }}
        >
          Your central hub for comprehensive weather intelligence.
        </motion.p>
        <motion.p 
          className="text-lg md:text-xl text-gray-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.6, 
            delay: 1.1,
            ease: "easeOut"
          }}
        >
          Stay informed. Stay ahead.
        </motion.p>
      </div>
    </div>
  );
};

export default HomePage;
