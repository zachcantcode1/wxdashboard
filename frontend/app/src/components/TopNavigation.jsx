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
  Menu,
  User,
  LogOut,
  Radar,
} from 'lucide-react';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger, NavigationMenuLink } from "../components/ui/navigation-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";

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
          <div className="flex-shrink-0 flex items-center gap-2">
            {/* Mobile menu trigger */}
            <Popover>
              <PopoverTrigger asChild>
                <Button className="md:hidden" variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-1 md:hidden">
                <NavigationMenu className="max-w-none *:w-full">
                  <NavigationMenuList className="flex-col items-start gap-0 md:gap-2">
                    {/* Home removed per UX: avoid navigating back to greeting */}
                    {/* Current Weather */}
                    <NavigationMenuItem className="w-full">
                      <NavigationMenuLink asChild>
                        <Link to="/current-weather" className="py-1.5 w-full block">Current Weather</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                    {/* Today's Weather */}
                    <NavigationMenuItem className="w-full">
                      <NavigationMenuLink asChild>
                        <Link to="/todays-weather" className="py-1.5 w-full block">Today's Weather</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                    {/* Storm Reports */}
                    <NavigationMenuItem className="w-full">
                      <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">Storm Reports</div>
                      <ul>
                        {stormReportsItems.map((item) => (
                          <li key={item.title}>
                            <NavigationMenuLink asChild>
                              <Link to={item.path} className="py-1.5 w-full block">{item.title}</Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuItem>
                    {/* Severe Weather */}
                    <NavigationMenuItem className="w-full">
                      <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">Severe Weather</div>
                      <ul>
                        {severeWeatherItems.map((item) => (
                          <li key={item.title}>
                            <NavigationMenuLink asChild>
                              <Link to={item.path} className="py-1.5 w-full block">{item.title}</Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuItem>
                    {/* External */}
                    <NavigationMenuItem className="w-full">
                      <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">External</div>
                      <ul>
                        {externalServices.map((service) => (
                          <li key={service.title}>
                            <NavigationMenuLink href={service.url} className="py-1.5" target="_blank" rel="noopener noreferrer">
                              {service.title}
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
              </PopoverContent>
            </Popover>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Link to="/" className="text-sm sm:text-base font-bold text-foreground hover:text-primary transition-colors">
                Impact Weather
              </Link>
            </motion.div>
          </div>

          {/* Desktop Navigation Menu (OriginUI style) */}
          <NavigationMenu viewport={false} className="hidden lg:flex">
            <NavigationMenuList className="gap-2">
              {/* Home removed per UX: avoid navigating back to greeting */}
              {/* Current Weather */}
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link to="/current-weather" className="px-2 py-1.5">Current Weather</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              {/* Today's Weather */}
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link to="/todays-weather" className="px-2 py-1.5">Today's Weather</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              {/* Storm Reports */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-muted-foreground hover:text-primary bg-transparent px-2 py-1.5 font-medium *:[svg]:-me-0.5 *:[svg]:size-3.5">
                  Storm Reports
                </NavigationMenuTrigger>
                <NavigationMenuContent className="z-50 p-1">
                  <ul className="min-w-48">
                    {stormReportsItems.map((item) => (
                      <li key={item.title}>
                        <NavigationMenuLink asChild>
                          <Link to={item.path} className="py-1.5 block px-2">{item.title}</Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              {/* Severe Weather */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-muted-foreground hover:text-primary bg-transparent px-2 py-1.5 font-medium *:[svg]:-me-0.5 *:[svg]:size-3.5">
                  Severe Weather
                </NavigationMenuTrigger>
                <NavigationMenuContent className="z-50 p-1">
                  <ul className="min-w-48">
                    {severeWeatherItems.map((item) => (
                      <li key={item.title}>
                        <NavigationMenuLink asChild>
                          <Link to={item.path} className="py-1.5 block px-2">{item.title}</Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              {/* External */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-muted-foreground hover:text-primary bg-transparent px-2 py-1.5 font-medium *:[svg]:-me-0.5 *:[svg]:size-3.5">
                  External
                </NavigationMenuTrigger>
                <NavigationMenuContent className="z-50 p-1">
                  <ul className="min-w-48">
                    {externalServices.map((service) => (
                      <li key={service.title}>
                        <NavigationMenuLink href={service.url} target="_blank" rel="noopener noreferrer" className="py-1.5 block px-2">
                          {service.title}
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Medium screens: keep the desktop NavigationMenu visible */}
          <div className="hidden md:flex lg:hidden" />

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
                    <p className="text-sm font-medium leading-none">Impact Weather</p>
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

        {/* Mobile list moved to Popover in the left section */}
      </div>
    </nav>
  );
}
