
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { AuthProvider, useClerk, useUser } from './context/AuthContext'; // Updated Import
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Onboarding from './pages/Onboarding';
import Signup from './pages/Signup';
import Navbar from './components/Navbar';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Icons } from './components/Icons';
import { UserMetadata } from './types';
import { UserButton } from '@clerk/clerk-react';

const Profile: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { signOut } = useClerk();
  const { user } = useUser();

  const handleGuestLogout = () => {
    signOut();
    localStorage.removeItem('guest_mode');
    window.location.href = '/login';
  };

  const meta = user?.unsafeMetadata as unknown as UserMetadata;

  return (
    <div className="p-8 pb-24 min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white transition-colors">
      <h2 className="text-2xl font-bold mb-6 text-center">Profile Settings</h2>

      {/* Dark Mode Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
              {isDarkMode ? <Icons.Moon size={20} /> : <Icons.Sun size={20} />}
            </div>
            <span className="font-medium">Dark Mode</span>
          </div>
          <button
            onClick={toggleTheme}
            className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out ${
              isDarkMode ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                isDarkMode ? 'translate-x-6' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Stats Section */}
      {meta && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm mb-6">
          <h3 className="font-bold text-gray-500 text-sm uppercase mb-4">Your Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <span className="block text-2xl font-bold text-emerald-600 dark:text-emerald-400">{meta.bmi}</span>
              <span className="text-xs text-gray-400 uppercase">BMI</span>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <span className="block text-2xl font-bold text-emerald-600 dark:text-emerald-400">{meta.targetCalories}</span>
              <span className="text-xs text-gray-400 uppercase">Calorie Target</span>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <span className="block text-2xl font-bold text-emerald-600 dark:text-emerald-400">{meta.weight}</span>
              <span className="text-xs text-gray-400 uppercase">Weight (kg)</span>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <span className="block text-2xl font-bold text-emerald-600 dark:text-emerald-400">{meta.height}</span>
              <span className="text-xs text-gray-400 uppercase">Height (cm)</span>
            </div>
          </div>
        </div>
      )}

      {/* Account Section with Clerk menu */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm text-center">
        {user ? (
          <div className="flex flex-col items-center gap-4">
            <div className="transform scale-125">
              {/* This shows the Clerk menu like in your screenshot */}
              <UserButton showName={true} />
            </div>
            <p className="text-xs text-gray-400">
              Tap your profile above to manage account
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              Logged in as Guest
            </p>
            <button
              onClick={handleGuestLogout}
              className="flex items-center justify-center gap-2 w-full text-red-500 font-bold border border-red-200 dark:border-red-900/30 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <Icons.Logout size={20} />
              Log Out
            </button>
          </>
        )}
      </div>
    </div>
  );
};


const AppContent: React.FC = () => {
  // Safe Notification Logic
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    const showNotification = (title: string, body: string) => {
      if (Notification.permission !== 'granted') return;
      
      try {
        // Try service worker method first (for mobile)
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, { 
              body, 
              icon: "/icon.png" 
            });
          }).catch(() => {
            // Fallback: just skip notification on error
            console.log('Notification skipped');
          });
        } else {
          // Desktop fallback
          new Notification(title, { body, icon: "/icon.png" });
        }
      } catch (error) {
        // Silently fail on unsupported devices
        console.log('Notification not supported on this device');
      }
    };

    const checkNotifications = () => {
      const now = Date.now();
      const lastWater = parseInt(localStorage.getItem('lastWaterNotif') || '0');
      const lastActivity = parseInt(localStorage.getItem('lastActivityNotif') || '0');
    
      const WATER_INTERVAL = 90 * 60 * 1000; // 1.5 hours
      const ACTIVITY_INTERVAL = 120 * 60 * 1000; // 2 hours

      // Check Water
      if (now - lastWater > WATER_INTERVAL) {
        showNotification("Madhumeh Mitra", "Remember to Drink water!");
        localStorage.setItem('lastWaterNotif', now.toString());
      }

      // Check Activity
      if (now - lastActivity > ACTIVITY_INTERVAL) {
        showNotification("Madhumeh Mitra", "Go for a walk or do some activity!");
        localStorage.setItem('lastActivityNotif', now.toString());
      }
    };

    // Run check immediately on load, then every minute
    checkNotifications();
    const interval = setInterval(checkNotifications, 60000); 

    return () => clearInterval(interval);
  }, []);


  return (
    <BrowserRouter>
      <div className="max-w-md mx-auto bg-white dark:bg-gray-900 min-h-screen shadow-2xl overflow-hidden relative transition-colors duration-200">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
           <Route path="/signup" element={<Signup />} />
        </Routes>
        <Navbar />
      </div>
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
          <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
