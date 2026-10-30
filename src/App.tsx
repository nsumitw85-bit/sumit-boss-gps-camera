import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera,
  LayoutDashboard,
  Navigation,
  Map as MapIcon,
  Images,
  History,
  Settings as SettingsIcon,
} from 'lucide-react';
import {
  Language,
  LocationData,
  AddressData,
  CapturedPhoto,
  AppSettings,
} from './types';
import { dbService, DEFAULT_SETTINGS } from './services/db';
import { gpsService } from './services/gps';
import { voiceService } from './services/tts';
import { getTranslation } from './i18n/translations';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { CameraView } from './components/CameraView';
import { LiveLocationView } from './components/LiveLocationView';
import { GoogleMapView } from './components/GoogleMapView';
import { PhotoGallery } from './components/PhotoGallery';
import { LocationHistoryView } from './components/LocationHistoryView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  // Launch straight into GPS Camera
  const [activeScreen, setActiveScreen] = useState<string>('camera');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);

  // Real GPS & Reverse Geocoded Address
  const [location, setLocation] = useState<LocationData | null>(null);
  const [address, setAddress] = useState<AddressData | null>(null);

  // Load photos and settings from IndexedDB
  const loadData = useCallback(async () => {
    try {
      const [storedSettings, storedPhotos] = await Promise.all([
        dbService.getSettings(),
        dbService.getPhotos(),
      ]);

      setSettings(storedSettings);
      setPhotos(storedPhotos);
      voiceService.configure(storedSettings.voiceAnnouncements, storedSettings.speechVolume);
    } catch (err) {
      console.error('Error loading stored app state:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Start continuous GPS tracking
  useEffect(() => {
    gpsService.startWatching();

    const unsubscribe = gpsService.subscribe(async (newLoc) => {
      setLocation(newLoc);

      if (newLoc.status === 'current' && newLoc.latitude && newLoc.longitude) {
        const resolvedAddr = await gpsService.reverseGeocode(newLoc.latitude, newLoc.longitude);
        setAddress(resolvedAddr);
      }
    });

    return () => {
      unsubscribe();
      gpsService.stopWatching();
    };
  }, []);

  // Automatic Welcome Voice on initial application launch: "Welcome to Sumit Boss."
  useEffect(() => {
    const timer = setTimeout(() => {
      voiceService.announceWelcomeOnLaunch(false);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  const handleRefreshGps = async (): Promise<LocationData> => {
    const freshFix = await gpsService.requestSingleFreshFix();
    setLocation(freshFix);
    if (freshFix.status === 'current' && freshFix.latitude && freshFix.longitude) {
      const resolved = await gpsService.reverseGeocode(freshFix.latitude, freshFix.longitude, true);
      setAddress(resolved);
    }
    return freshFix;
  };

  return (
    <div
      className={`bg-slate-950 text-slate-100 flex flex-col font-sans ${
        activeScreen === 'camera' ? 'h-screen overflow-hidden' : 'min-h-screen pb-20 md:pb-0'
      }`}
    >
      {/* Top Header Navbar on non-camera views */}
      {activeScreen !== 'camera' && (
        <Navbar
          language={settings.language}
          location={location}
          onHomeClick={() => setActiveScreen('dashboard')}
          onOpenSettings={() => setActiveScreen('settings')}
          activeScreen={activeScreen}
        />
      )}

      {/* Desktop/Tablet Horizontal Navigation Bar on non-camera views */}
      {activeScreen !== 'camera' && (
        <div className="hidden md:block bg-slate-900 border-b border-slate-800 px-4 py-1.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveScreen('camera')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                activeScreen === 'camera'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>1. GPS Camera</span>
            </button>

            <button
              onClick={() => setActiveScreen('live_location')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                activeScreen === 'live_location'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>2. Live Location</span>
            </button>

            <button
              onClick={() => setActiveScreen('google_maps')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                activeScreen === 'google_maps'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span>3. Google Maps</span>
            </button>

            <button
              onClick={() => setActiveScreen('gallery')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                activeScreen === 'gallery'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Images className="w-4 h-4" />
              <span>4. Photo Gallery ({photos.length})</span>
            </button>

            <button
              onClick={() => setActiveScreen('history')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                activeScreen === 'history'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>5. GPS Photo History</span>
            </button>
          </div>

          <button
            onClick={() => setActiveScreen('dashboard')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
              activeScreen === 'dashboard'
                ? 'bg-slate-800 text-sky-400 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>
      )}

      {/* Screen Router */}
      <main className="flex-1 min-h-0 flex flex-col">
        {activeScreen === 'camera' && (
          <CameraView
            language={settings.language}
            location={location}
            address={address}
            settings={settings}
            onRefreshGps={handleRefreshGps}
            onPhotoSaved={loadData}
            onOpenSettings={() => setActiveScreen('settings')}
            onNavigate={(screen) => setActiveScreen(screen)}
          />
        )}

        {activeScreen === 'dashboard' && (
          <Dashboard
            language={settings.language}
            location={location}
            address={address}
            photosCount={photos.length}
            settings={settings}
            onRefreshGps={handleRefreshGps}
            onNavigate={(screen) => setActiveScreen(screen)}
          />
        )}

        {activeScreen === 'live_location' && (
          <LiveLocationView
            language={settings.language}
            location={location}
            address={address}
            onRefreshGps={handleRefreshGps}
            onOpenCamera={() => setActiveScreen('camera')}
          />
        )}

        {activeScreen === 'google_maps' && (
          <GoogleMapView
            language={settings.language}
            location={location}
            photos={photos}
            onOpenCamera={() => setActiveScreen('camera')}
          />
        )}

        {activeScreen === 'gallery' && (
          <PhotoGallery
            language={settings.language}
            photos={photos}
            onRefresh={loadData}
            onBack={() => setActiveScreen('dashboard')}
            onOpenCamera={() => setActiveScreen('camera')}
          />
        )}

        {activeScreen === 'history' && (
          <LocationHistoryView
            language={settings.language}
            photos={photos}
            onBack={() => setActiveScreen('dashboard')}
            onOpenCamera={() => setActiveScreen('camera')}
          />
        )}

        {activeScreen === 'settings' && (
          <SettingsView
            language={settings.language}
            settings={settings}
            onSaveSettings={(s) => setSettings(s)}
            onBack={() => setActiveScreen('camera')}
            onNavigate={(screen) => setActiveScreen(screen)}
          />
        )}
      </main>

      {/* Bottom Sticky Mobile Navigation Bar */}
      {activeScreen !== 'camera' && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-2 flex items-center justify-around shadow-2xl"
          aria-label="Bottom Navigation"
        >
          <button
            onClick={() => setActiveScreen('camera')}
            className={`flex flex-col items-center gap-1 p-1 ${
              activeScreen === 'camera' ? 'text-sky-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span className="text-[10px]">Camera</span>
          </button>

          <button
            onClick={() => setActiveScreen('live_location')}
            className={`flex flex-col items-center gap-1 p-1 ${
              activeScreen === 'live_location' ? 'text-sky-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Navigation className="w-5 h-5" />
            <span className="text-[10px]">Live GPS</span>
          </button>

          <button
            onClick={() => setActiveScreen('google_maps')}
            className={`flex flex-col items-center gap-1 p-1 ${
              activeScreen === 'google_maps' ? 'text-sky-400 font-bold' : 'text-slate-400'
            }`}
          >
            <MapIcon className="w-5 h-5" />
            <span className="text-[10px]">17 Wards</span>
          </button>

          <button
            onClick={() => setActiveScreen('gallery')}
            className={`flex flex-col items-center gap-1 p-1 ${
              activeScreen === 'gallery' ? 'text-sky-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Images className="w-5 h-5" />
            <span className="text-[10px]">Gallery</span>
          </button>

          <button
            onClick={() => setActiveScreen('history')}
            className={`flex flex-col items-center gap-1 p-1 ${
              activeScreen === 'history' ? 'text-sky-400 font-bold' : 'text-slate-400'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px]">History</span>
          </button>
        </nav>
      )}
    </div>
  );
}
