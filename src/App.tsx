import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { CinematicLoader } from './components/CinematicLoader';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { OverviewView } from './components/OverviewView';
import { AnalyticsView } from './components/AnalyticsView';
import { AboutJojoberaView } from './components/AboutJojoberaView';
import { AlarmCenterView } from './components/AlarmCenterView';
import { DataExplorerView } from './components/DataExplorerView';
import { AdminPortalView } from './components/AdminPortalView';
import { ThreeDTemperatureAnalytics } from './components/ThreeDTemperature/ThreeDTemperatureAnalytics';
import { UploadModal } from './components/UploadModal';
import { LoginModal } from './components/LoginModal';
import { TataPowerLogo } from './components/TataPowerLogo';
import { Zap, Shield, Globe, MapPin, Building } from 'lucide-react';

const MainApplication: React.FC = () => {
  const [showCinematicIntro, setShowCinematicIntro] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const { currentDataset, alarmSummary, setIsUploadModalOpen } = useData();

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentTab]);

  return (
    <div className="min-h-screen w-full bg-[#070D18] text-[#E2E8F0] flex flex-col font-sans selection:bg-[#205CA5] selection:text-white industrial-grid overflow-x-hidden">
      {/* Cinematic Fullscreen Loader */}
      <AnimatePresence>
        {showCinematicIntro && (
          <CinematicLoader onComplete={() => setShowCinematicIntro(false)} />
        )}
      </AnimatePresence>

      {/* Main App Layout */}
      {!showCinematicIntro && (
        <motion.div
          id="tata-power-command-app"
          className="flex-1 flex flex-col min-h-screen w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Top Sticky Command Navbar */}
          <Navbar
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            onReplayIntro={() => setShowCinematicIntro(true)}
          />

          {/* Main Content Area - Full-width fluid responsive layout */}
          <main className="flex-1 w-full max-w-full px-3 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 py-4 sm:py-6">
            {(currentTab === 'dashboard' || currentTab === 'overview') && (
              <OverviewView
                onNavigateToAnalytics={() => setCurrentTab('analytics')}
                onNavigateToUpload={() => setIsUploadModalOpen(true)}
                onNavigateToAlerts={() => setCurrentTab('alerts')}
                onNavigateToDataManagement={() => setCurrentTab('data-management')}
              />
            )}

            {currentTab === 'analytics' && (
              <AnalyticsView onOpenUpload={() => setIsUploadModalOpen(true)} />
            )}

            {(currentTab === 'alerts' || currentTab === 'alarms') && <AlarmCenterView />}

            {(currentTab === 'data-management' || currentTab === 'explorer') && (
              <DataExplorerView onOpenUpload={() => setIsUploadModalOpen(true)} />
            )}

            {currentTab === 'temperature3d' && (
              <ThreeDTemperatureAnalytics onOpenUpload={() => setIsUploadModalOpen(true)} />
            )}

            {currentTab === 'about' && <AboutJojoberaView />}

            {currentTab === 'admin' && <AdminPortalView />}
          </main>

          {/* Global Modals */}
          <UploadModal />
          <LoginModal />

          {/* Industrial Footer Status Bar */}
          <footer className="mt-auto border-t border-[#1E293B] bg-[#070D18] py-6 w-full">
            <div className="w-full max-w-full px-3 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-[#94A3B8] font-mono tracking-wider uppercase">
              <div className="flex items-center space-x-3">
                <TataPowerLogo
                  variant="full"
                  subtitleText="Jojobera Thermal Power Station · 427.5 MW"
                />
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-4 text-center md:text-right">
                <span>Node: TP-JSR-01</span>
                <span className="hidden sm:inline text-[#1E293B]">|</span>
                <span>LAT: 22.7578° N · LONG: 86.2411° E</span>
                <span className="hidden sm:inline text-[#1E293B]">|</span>
                <span className="text-[#00FF41] flex items-center space-x-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse" />
                  <span>SECURE SSL ACTIVE</span>
                </span>
                <span className="hidden sm:inline text-[#1E293B]">|</span>
                <span className="text-[#38BDF8] font-bold">v4.2.0-ENTERPRISE</span>
              </div>
            </div>
          </footer>
        </motion.div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <MainApplication />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
