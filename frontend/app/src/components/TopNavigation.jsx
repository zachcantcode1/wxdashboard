import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../components/ui/dropdown-menu';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { cn } from '../lib/utils';
import {
  Home,
  CloudSun,
  AlertTriangle,
  List,
  BarChart2,
  ExternalLink,
  Settings,
  HelpCircle,
  ChevronDown,
  User,
  LogOut,
  Radar,
} from 'lucide-react';

const navigationItems = [
  {
    title: "Home",
    path: "/",
    icon: Home,
  },
  {
    title: "Current Weather",
    path: "/current-weather",
    icon: CloudSun,
  },
];

const stormReportsItems = [
  {
    title: "Recent LSR",
    path: "/recent-lsr",
    icon: List,
  },
  {
    title: "Top Storm Reports",
    path: "/top-storm-reports",
    icon: BarChart2,
  },
];

const severeWeatherItems = [
  {
    title: "Active Alerts",
    path: "/active-alerts",
    icon: AlertTriangle,
  },
  {
    title: "Weather Severity Index",
    path: "/weather-stats",
    icon: BarChart2,
  },
  {
    title: "Outlooks",
    path: "/outlooks",
    icon: Radar,
  },
];

const externalServices = [
  {
    title: "Pivotal Weather",
    url: "https://beta.pivotalweather.com/login",
    icon: CloudSun,
  },
  {
    title: "WeatherWise",
    url: "https://web.weatherwise.app/#map=3.82/36.91/-96.35",
    icon: CloudSun,
  },
];

export function TopNavigation() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [isExternalOpen, setIsExternalOpen] = useState(false);
  const [isExternalMediumOpen, setIsExternalMediumOpen] = useState(false);
  const [isStormReportsOpen, setIsStormReportsOpen] = useState(false);
  const [isStormReportsMediumOpen, setIsStormReportsMediumOpen] = useState(false);
  const [isSevereOpen, setIsSevereOpen] = useState(false);
  const [isSevereMediumOpen, setIsSevereMediumOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  // Check if current path is a storm reports page
  const isStormReportsActive = stormReportsItems.some(item => location.pathname === item.path);
  const isSevereActive = severeWeatherItems.some(item => location.pathname === item.path);

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-full px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Link to="/" className="text-sm sm:text-base font-bold text-foreground hover:text-primary transition-colors">
                WX DASHBOARD
              </Link>
            </motion.div>
          </div>

          {/* Navigation Links - Preserve meaningful labels */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <motion.div
                  key={item.title}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center px-2 xl:px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <motion.div
                      animate={{ rotate: isActive ? 360 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <item.icon className="h-4 w-4 mr-1.5" />
                    </motion.div>
                    {item.title}
                  </Link>
                </motion.div>
              );
            })}

            {/* Storm Reports Dropdown */}
            <DropdownMenu open={isStormReportsOpen} onOpenChange={setIsStormReportsOpen}>
              <DropdownMenuTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex items-center px-2 xl:px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                      isStormReportsActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <motion.div
                      animate={{ rotate: isStormReportsActive ? 360 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <List className="h-4 w-4 mr-1.5" />
                    </motion.div>
                    Storm Reports
                    <motion.div
                      animate={{ rotate: isStormReportsOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </motion.div>
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {stormReportsItems.map((item) => (
                  <DropdownMenuItem key={item.title} asChild>
                    <Link
                      to={item.path}
                      className="flex items-center cursor-pointer"
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Severe Weather Dropdown */}
            <DropdownMenu open={isSevereOpen} onOpenChange={setIsSevereOpen}>
              <DropdownMenuTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex items-center px-2 xl:px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                      isSevereActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <motion.div
                      animate={{ rotate: isSevereActive ? 360 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1.5" />
                    </motion.div>
                    Severe Weather
                    <motion.div
                      animate={{ rotate: isSevereOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </motion.div>
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {severeWeatherItems.map((item) => (
                  <DropdownMenuItem key={item.title} asChild>
                    <Link
                      to={item.path}
                      className="flex items-center cursor-pointer"
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* External Services Dropdown */}
            <DropdownMenu open={isExternalOpen} onOpenChange={setIsExternalOpen}>
              <DropdownMenuTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    variant="ghost"
                    className="flex items-center px-2 xl:px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent whitespace-nowrap"
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    External Services
                    <motion.div
                      animate={{ rotate: isExternalOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </motion.div>
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {externalServices.map((service) => (
                  <DropdownMenuItem key={service.title} asChild>
                    <a
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center cursor-pointer"
                    >
                      <service.icon className="h-4 w-4 mr-2" />
                      {service.title}
                    </a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Medium screens - Show main items plus Storm Reports dropdown */}
          <div className="hidden md:flex lg:hidden items-center space-x-1">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.title}
                  to={item.path}
                  className={cn(
                    "flex items-center px-2 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="h-4 w-4 mr-1" />
                  {item.title}
                </Link>
              );
            })}

            {/* Storm Reports Dropdown for medium screens */}
            <DropdownMenu open={isStormReportsMediumOpen} onOpenChange={setIsStormReportsMediumOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "flex items-center px-2 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                    isStormReportsActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <List className="h-4 w-4 mr-1" />
                  Storm Reports
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {stormReportsItems.map((item) => (
                  <DropdownMenuItem key={item.title} asChild>
                    <Link
                      to={item.path}
                      className="flex items-center cursor-pointer"
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Severe Weather Dropdown for medium screens */}
            <DropdownMenu open={isSevereMediumOpen} onOpenChange={setIsSevereMediumOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "flex items-center px-2 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                    isSevereActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Severe Weather
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {severeWeatherItems.map((item) => (
                  <DropdownMenuItem key={item.title} asChild>
                    <Link
                      to={item.path}
                      className="flex items-center cursor-pointer"
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* External Services for medium screens */}
            <DropdownMenu open={isExternalMediumOpen} onOpenChange={setIsExternalMediumOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center px-2 py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent whitespace-nowrap"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  External
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {externalServices.map((service) => (
                  <DropdownMenuItem key={service.title} asChild>
                    <a
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center cursor-pointer"
                    >
                      <service.icon className="h-4 w-4 mr-2" />
                      {service.title}
                    </a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* User Profile Dropdown */}
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <motion.div
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Weather Dashboard</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation - Collapsible */}
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.title}
                  to={item.path}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.title}
                </Link>
              );
            })}
            
            {/* Mobile Severe Weather */}
            <div className="pt-2">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Severe Weather
              </p>
              {severeWeatherItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.path}
                  className="flex items-center px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.title}
                </Link>
              ))}
            </div>
            
            {/* Mobile External Services */}
            <div className="pt-2">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                External Services
              </p>
              {externalServices.map((service) => (
                <a
                  key={service.title}
                  href={service.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <service.icon className="h-5 w-5 mr-3" />
                  {service.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
