import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera,
  Home,
  Users,
  Images,
  FileText,
  Settings as SettingsIcon,
  FolderKanban,
  History,
} from 'lucide-react';
import {
  Language,
  LocationData,
  AddressData,
  Worker,
  WorkCategory,
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
import { WorkerManager } from './components/WorkerManager';
import { CategoryManager } from './components/CategoryManager';
import { PhotoGallery } from './components/PhotoGallery';
import { LocationHistoryView } from './components/LocationHistoryView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  // Requirement 3: Open the camera directly when the app starts
  const [activeScreen, setActiveScreen] = useState<string>('camera');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [categories, setCategories] = useState<WorkCategory[]>([]);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);

  // Selected capture context
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedWard, setSelectedWard] = useState<string>('');

  // Real GPS & Reverse Geocoded Address
  const [location, setLocation] = useState<LocationData | null>(null);
  const [address, setAddress] = useState<AddressData | null>(null);

  // Load all initial data from IndexedDB
  const loadData = useCallback(async () => {
    try {
      const [storedSettings, storedWorkers, storedCategories, storedPhotos] = await Promise.all([
        dbService.getSettings(),
        dbService.getWorkers(),
        dbService.getCategories(),
        dbService.getPhotos(),
      ]);

      setSettings(storedSettings);
      setWorkers(storedWorkers);
      setCategories(storedCategories);
      setPhotos(storedPhotos);

      if (storedSettings.defaultWorkerId && !selectedWorkerId) {
        setSelectedWorkerId(storedSettings.defaultWorkerId);
      } else if (storedWorkers[0] && !selectedWorkerId) {
        setSelectedWorkerId(storedWorkers[0].id);
      }

      if (storedSettings.defaultCategoryId && !selectedCategoryId) {
        setSelectedCategoryId(storedSettings.defaultCategoryId);
      } else if (storedCategories[0] && !selectedCategoryId) {
        setSelectedCategoryId(storedCategories[0].id);
      }

      // Requirement 1: Never hardcode or default to Ward 12
      if (
        storedSettings.defaultWard &&
        storedSettings.defaultWard !== 'Ward 12' &&
        storedSettings.defaultWard !== 'Ward not identified' &&
        !selectedWard
      ) {
        setSelectedWard(storedSettings.defaultWard);
      }

      voiceService.configure(storedSettings.voiceAnnouncements, storedSettings.speechVolume);
    } catch (err) {
      console.error('Error loading stored app state:', err);
    }
  }, [selectedWorkerId, selectedCategoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Start GPS tracking
  useEffect(() => {
    gpsService.startWatching();

    const unsubscribe = gpsService.subscribe(async (newLoc) => {
      setLocation(newLoc);

      if (newLoc.status === 'current' && newLoc.latitude && newLoc.longitude) {
        // Reverse geocode if coordinates available
        const resolvedAddr = await gpsService.reverseGeocode(newLoc.latitude, newLoc.longitude);
        setAddress(resolvedAddr);
      }
    });

    return () => {
      unsubscribe();
      gpsService.stopWatching();
    };
  }, []);

  // Voice announcement on initial launch
  useEffect(() => {
    const timer = setTimeout(() => {
      voiceService.announceEvent('welcome', settings.language);
    }, 1200);
    return () => clearTimeout(timer);
  }, [settings.language]);

  const handleRefreshGps = async (): Promise<LocationData> => {
    const freshFix = await gpsService.requestSingleFreshFix();
    setLocation(freshFix);
    if (freshFix.status === 'current' && freshFix.latitude && freshFix.longitude) {
      const resolved = await gpsService.reverseGeocode(freshFix.latitude, freshFix.longitude, true);
      setAddress(resolved);
      voiceService.announceEvent('gps_acquired', settings.language);
    }
    return freshFix;
  };

  const handleToggleVoice = () => {
    const newVoiceState = !settings.voiceAnnouncements;
    const updated = { ...settings, voiceAnnouncements: newVoiceState };
    setSettings(updated);
    dbService.saveSettings(updated);
    voiceService.configure(newVoiceState, updated.speechVolume);
  };

  const handleLanguageChange = (lang: Language) => {
    const updated = { ...settings, language: lang };
    setSettings(updated);
    dbService.saveSettings(updated);
  };

  return (
    <div
      className={`bg-slate-950 text-slate-100 flex flex-col font-sans ${
        activeScreen === 'camera' ? 'h-screen overflow-hidden' : 'min-h-screen pb-16 md:pb-0'
      }`}
    >
      {/* Top Header Navbar */}
      <Navbar
        language={settings.language}
        location={location}
        onHomeClick={() => setActiveScreen('camera')}
        onOpenSettings={() => setActiveScreen('settings')}
        activeScreen={activeScreen}
      />

      {/* Screen Router */}
      <main className="flex-1 min-h-0 flex flex-col">
        {activeScreen === 'camera' && (
          <CameraView
            language={settings.language}
            location={location}
            address={address}
            workers={workers}
            categories={categories}
            settings={settings}
            selectedWorkerId={selectedWorkerId}
            onSelectWorkerId={setSelectedWorkerId}
            selectedCategoryId={selectedCategoryId}
            onSelectCategoryId={setSelectedCategoryId}
            selectedWard={selectedWard}
            onSelectWard={setSelectedWard}
            onRefreshGps={handleRefreshGps}
            onPhotoSaved={loadData}
            onBack={() => setActiveScreen('settings')}
            onOpenSettings={() => setActiveScreen('settings')}
          />
        )}

        {activeScreen === 'settings' && (
          <SettingsView
            language={settings.language}
            settings={settings}
            workers={workers}
            categories={categories}
            onSaveSettings={(s) => setSettings(s)}
            onRefreshAllData={loadData}
            onBack={() => setActiveScreen('camera')}
            onNavigate={(screen) => setActiveScreen(screen)}
          />
        )}

        {activeScreen === 'dashboard' && (
          <Dashboard
            language={settings.language}
            location={location}
            address={address}
            workers={workers}
            categories={categories}
            photosCount={photos.length}
            settings={settings}
            selectedWorkerId={selectedWorkerId}
            onSelectWorkerId={setSelectedWorkerId}
            selectedCategoryId={selectedCategoryId}
            onSelectCategoryId={setSelectedCategoryId}
            selectedWard={selectedWard}
            onSelectWard={setSelectedWard}
            onRefreshGps={handleRefreshGps}
            onNavigate={(screen) => setActiveScreen(screen)}
          />
        )}

        {activeScreen === 'workers' && (
          <WorkerManager
            language={settings.language}
            workers={workers}
            categories={categories}
            selectedWorkerId={selectedWorkerId}
            onSelectWorkerId={setSelectedWorkerId}
            onRefresh={loadData}
            onBack={() => setActiveScreen('settings')}
          />
        )}

        {activeScreen === 'categories' && (
          <CategoryManager
            language={settings.language}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategoryId={setSelectedCategoryId}
            onRefresh={loadData}
            onBack={() => setActiveScreen('settings')}
          />
        )}

        {activeScreen === 'gallery' && (
          <PhotoGallery
            language={settings.language}
            photos={photos}
            workers={workers}
            categories={categories}
            onRefresh={loadData}
            onBack={() => setActiveScreen('settings')}
          />
        )}

        {activeScreen === 'history' && (
          <LocationHistoryView
            language={settings.language}
            photos={photos}
            onBack={() => setActiveScreen('settings')}
          />
        )}

        {activeScreen === 'reports' && (
          <ReportsView
            language={settings.language}
            photos={photos}
            workers={workers}
            categories={categories}
            onBack={() => setActiveScreen('settings')}
          />
        )}
      </main>

      {/* Bottom Sticky Mobile Dock */}
      {activeScreen !== 'camera' && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-3 py-2 flex items-center justify-around shadow-2xl"
          aria-label="Bottom Quick Navigation"
        >
          <button
            onClick={() => setActiveScreen('camera')}
            className={`flex flex-col items-center gap-1 p-1 ${
              activeScreen === 'camera' ? 'text-blue-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span className="text-[10px]">Camera</span>
          </button>

          <button
            onClick={() => setActiveScreen('gallery')}
            className={`flex flex-col items-center gap-1 p-1 ${
              activeScreen === 'gallery' ? 'text-blue-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Images className="w-5 h-5" />
            <span className="text-[10px]">Photos</span>
          </button>

          <button
            onClick={() => setActiveScreen('settings')}
            className="flex flex-col items-center -mt-5"
          >
            <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/40 p-3 hover:scale-105 active:scale-95 transition-all">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <span className="text-[10px] text-sky-400 font-bold mt-1">Settings</span>
          </button>

          <button
            onClick={() => setActiveScreen('workers')}
            className={`flex flex-col items-center gap-1 p-1 ${
              activeScreen === 'workers' ? 'text-blue-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px]">Workers</span>
          </button>

          <button
            onClick={() => setActiveScreen('reports')}
            className={`flex flex-col items-center gap-1 p-1 ${
              activeScreen === 'reports' ? 'text-blue-400 font-bold' : 'text-slate-400'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px]">Reports</span>
          </button>
        </nav>
      )}
    </div>
  );
}
