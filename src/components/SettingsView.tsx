import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Globe,
  Sliders,
  Volume2,
  VolumeX,
  Database,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Layout,
  Crosshair,
  ShieldCheck,
  Save,
  MapPin,
  Key,
  Users,
  FolderKanban,
  Images,
  History,
  FileText,
  LayoutDashboard,
  ChevronRight,
} from 'lucide-react';
import { AppSettings, Worker, WorkCategory, Language, OverlayLayout } from '../types';
import { getTranslation } from '../i18n/translations';
import { dbService } from '../services/db';
import { voiceService } from '../services/tts';
import { wardBoundaryService } from '../services/wardBoundaryService';

interface SettingsViewProps {
  language: Language;
  settings: AppSettings;
  workers: Worker[];
  categories: WorkCategory[];
  onSaveSettings: (settings: AppSettings) => void;
  onRefreshAllData: () => void;
  onBack: () => void;
  onNavigate?: (screen: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  language,
  settings,
  workers,
  categories,
  onSaveSettings,
  onRefreshAllData,
  onBack,
  onNavigate,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleToggle = (key: keyof AppSettings) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLanguageChange = async (newLang: Language) => {
    const updated = { ...localSettings, language: newLang };
    setLocalSettings(updated);
    await dbService.saveSettings(updated);
    onSaveSettings(updated);
    setSuccessMsg(getTranslation(newLang, 'settingsSavedSuccess'));
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleToggleSound = async () => {
    const newSoundState = !localSettings.voiceAnnouncements;
    const updated = { ...localSettings, voiceAnnouncements: newSoundState };
    setLocalSettings(updated);
    await dbService.saveSettings(updated);
    onSaveSettings(updated);
    voiceService.configure(newSoundState, updated.speechVolume);
    setSuccessMsg(newSoundState ? 'Sound announcements enabled' : 'Sound announcements muted');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleSave = async () => {
    await dbService.saveSettings(localSettings);
    onSaveSettings(localSettings);
    voiceService.configure(localSettings.voiceAnnouncements, localSettings.speechVolume);
    setSuccessMsg(getTranslation(localSettings.language, 'settingsSavedSuccess'));
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleExportBackup = async () => {
    try {
      const json = await dbService.exportBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SumitBoss_DatabaseBackup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMsg('Database exported successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg('Backup export failed: ' + err.message);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const res = await dbService.importBackup(text);
        if (res.success) {
          setSuccessMsg('Database restored successfully.');
          onRefreshAllData();
        } else {
          setErrorMsg(res.message);
        }
      } catch (err: any) {
        setErrorMsg('Failed to read file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-md">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-slate-300" />
            <span>{getTranslation(language, 'settingsTitle')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure photo watermark styling, GPS accuracy sensitivity, voice feedback, and data backup.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            {getTranslation(language, 'back')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{getTranslation(language, 'saveSettings')}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Non-Camera Application Modules & Features */}
      {onNavigate && (
        <div className="bg-slate-800/95 p-5 rounded-2xl border border-blue-500/30 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Application Features &amp; Documentation Modules</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Access worker rosters, work categories, saved photos, location history, and PDF reports.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            <button
              onClick={() => onNavigate('workers')}
              className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/60 rounded-xl text-left transition-all group flex items-start justify-between cursor-pointer"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white group-hover:text-blue-300 transition-colors">
                    Worker Management
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {workers.length} workers registered
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
            </button>

            <button
              onClick={() => onNavigate('categories')}
              className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/60 rounded-xl text-left transition-all group flex items-start justify-between cursor-pointer"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white group-hover:text-indigo-300 transition-colors">
                    Work Categories
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {categories.length} categories active
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </button>

            <button
              onClick={() => onNavigate('gallery')}
              className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-sky-500/60 rounded-xl text-left transition-all group flex items-start justify-between cursor-pointer"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-sky-600/20 text-sky-400 rounded-lg group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <Images className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white group-hover:text-sky-300 transition-colors">
                    Saved Photos Gallery
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Inspect, download, share
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
            </button>

            <button
              onClick={() => onNavigate('history')}
              className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/60 rounded-xl text-left transition-all group flex items-start justify-between cursor-pointer"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors">
                    Location History &amp; Map
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    GPS timeline &amp; markers
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </button>

            <button
              onClick={() => onNavigate('reports')}
              className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/60 rounded-xl text-left transition-all group flex items-start justify-between cursor-pointer"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-amber-600/20 text-amber-400 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors">
                    Photo Reports (PDF)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Generate filtered reports
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </button>

            <button
              onClick={() => onNavigate('dashboard')}
              className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/60 rounded-xl text-left transition-all group flex items-start justify-between cursor-pointer"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors">
                    Dashboard Overview
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    System telemetry &amp; stats
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
            </button>
          </div>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Section 1: Localization & Display */}
        <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700 shadow-md space-y-4">
          <h2 className="text-sm font-bold text-sky-400 flex items-center gap-2 border-b border-slate-700 pb-2">
            <Globe className="w-4 h-4" />
            Language &amp; Layout
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span>{getTranslation(language, 'languageSelect')}</span>
                <span className="text-[11px] text-sky-400 font-mono">
                  {localSettings.language === 'mr' ? 'मराठी' : localSettings.language === 'hi' ? 'हिंदी' : 'English'}
                </span>
              </label>
              
              {/* Quick Language Selection Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    localSettings.language === 'en'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/30'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('mr')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    localSettings.language === 'mr'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/30'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  मराठी
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('hi')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    localSettings.language === 'hi'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/30'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  हिंदी
                </button>
              </div>

              <select
                value={localSettings.language}
                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="en">English (Default)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="hi">हिंदी (Hindi)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Default Photo Overlay Layout
              </label>
              <select
                value={localSettings.overlayLayout}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, overlayLayout: e.target.value as OverlayLayout })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="classic_bottom">Classic Bottom Banner (Recommended)</option>
                <option value="modern_card">Modern Glassmorphism Card</option>
                <option value="sidebar_compact">Sidebar Compact</option>
                <option value="full_inspector">Full Technical Inspector</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Date Display Format
              </label>
              <select
                value={localSettings.dateFormat}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, dateFormat: e.target.value as any })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: GPS Sensitivity */}
        <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700 shadow-md space-y-4">
          <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2 border-b border-slate-700 pb-2">
            <Crosshair className="w-4 h-4" />
            GPS Precision &amp; Thresholds
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-300 font-semibold">
                  {getTranslation(language, 'gpsAccuracyThreshold')}
                </label>
                <span className="font-mono text-emerald-400 font-bold">
                  {localSettings.minGpsAccuracy} meters
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={localSettings.minGpsAccuracy}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, minGpsAccuracy: parseInt(e.target.value) })
                }
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                A warning dialog will appear before capturing if the current GPS horizontal accuracy is worse than this value.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
              <div>
                <span className="font-semibold text-slate-200 block">
                  {getTranslation(language, 'autoRefreshGpsLabel')}
                </span>
                <span className="text-[11px] text-slate-400">
                  Continuously watch GPS satellites in foreground
                </span>
              </div>
              <input
                type="checkbox"
                checked={localSettings.autoRefreshGps}
                onChange={() => handleToggle('autoRefreshGps')}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
              <div>
                <span className="font-semibold text-slate-200 block">
                  {getTranslation(language, 'showMapOnStamp')}
                </span>
                <span className="text-[11px] text-slate-400">
                  Draw location map preview badge on bottom-left of photo stamp
                </span>
              </div>
              <input
                type="checkbox"
                checked={localSettings.showMiniMapInStamp}
                onChange={() => handleToggle('showMiniMapInStamp')}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-slate-700/60">
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Google Maps Static API Key (Optional)</span>
              </label>
              <input
                type="password"
                value={localSettings.googleMapsApiKey || ''}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, googleMapsApiKey: e.target.value })
                }
                placeholder="AIzaSy... (leave blank to use OpenStreetMap tiles)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                If provided, loads Google Maps Static API preview tiles. If left empty, seamlessly uses OpenStreetMap tiles without requiring any secret key.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Photo Storage & Quality */}
        <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700 shadow-md space-y-4">
          <h2 className="text-sm font-bold text-indigo-400 flex items-center gap-2 border-b border-slate-700 pb-2">
            <Sliders className="w-4 h-4" />
            Photo Archival
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block">
                  {getTranslation(language, 'saveOriginalToggle')}
                </span>
                <span className="text-[11px] text-slate-400">
                  Keep un-watermarked camera copy alongside stamped version
                </span>
              </div>
              <input
                type="checkbox"
                checked={localSettings.saveOriginalPhoto}
                onChange={() => handleToggle('saveOriginalPhoto')}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
              <div>
                <span className="font-semibold text-slate-200 block">
                  {getTranslation(language, 'saveStampedToggle')}
                </span>
                <span className="text-[11px] text-slate-400">
                  Save stamped high-res photo to local database
                </span>
              </div>
              <input
                type="checkbox"
                checked={localSettings.saveStampedPhoto}
                onChange={() => handleToggle('saveStampedPhoto')}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                JPEG Image Encoding Quality
              </label>
              <select
                value={localSettings.photoQuality}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, photoQuality: parseFloat(e.target.value) })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="0.95">95% (High Definition - Recommended)</option>
                <option value="0.85">85% (Balanced)</option>
                <option value="0.75">75% (Compact Storage)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Voice & Accessibility */}
        <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700 shadow-md space-y-4">
          <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2 border-b border-slate-700 pb-2">
            <Volume2 className="w-4 h-4" />
            Accessibility &amp; Voice (TTS)
          </h2>

          <div className="space-y-3 text-xs">
            {/* Prominent Sound Toggle Button */}
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl border transition-colors ${
                    localSettings.voiceAnnouncements
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}
                >
                  {localSettings.voiceAnnouncements ? (
                    <Volume2 className="w-5 h-5" />
                  ) : (
                    <VolumeX className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-slate-200 block text-xs">
                    Sound &amp; Voice Feedback
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {localSettings.voiceAnnouncements ? 'Audio enabled (active)' : 'Audio muted (silent)'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleSound}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  localSettings.voiceAnnouncements
                    ? 'bg-amber-500 text-slate-950 font-extrabold hover:bg-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                {localSettings.voiceAnnouncements ? 'ON' : 'MUTED'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="font-semibold text-slate-200 block">
                  {getTranslation(language, 'voiceAnnouncementsToggle')}
                </span>
                <span className="text-[11px] text-slate-400">
                  Audio prompts for camera, GPS fix, capture, and low-accuracy
                </span>
              </div>
              <input
                type="checkbox"
                checked={localSettings.voiceAnnouncements}
                onChange={handleToggleSound}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            <button
              onClick={() => voiceService.announceEvent('welcome', localSettings.language)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Test Voice Announcement</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 5: Authoritative Ward Boundaries */}
      <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-700 pb-2">
          <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Official Municipal Ward Boundary GeoJSON
          </h2>
          <span className="text-[11px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded">
            {wardBoundaryService.getDataset().municipalityName} ({wardBoundaryService.getDataset().wards.length} Wards)
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Ward numbers are determined using mathematical Point-in-Polygon (Ray-Casting) testing against official municipal boundary polygons. Coordinates outside all polygons are displayed as <strong className="text-rose-400">"Ward not identified"</strong> rather than guessed or defaulted.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <label className="py-2.5 px-4 bg-slate-900 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer text-center">
            <Upload className="w-4 h-4 text-amber-400" />
            <span>Import Official Ward GeoJSON</span>
            <input
              type="file"
              accept=".geojson,.json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const content = ev.target?.result as string;
                  const res = wardBoundaryService.importGeoJson(content, file.name.replace(/\.[^/.]+$/, ''));
                  if (res.success) {
                    setSuccessMsg(res.message);
                  } else {
                    setErrorMsg(res.message);
                  }
                };
                reader.readAsText(file);
              }}
              className="hidden"
            />
          </label>

          <button
            onClick={() => {
              const ds = wardBoundaryService.getDataset();
              setSuccessMsg(`Official dataset: ${ds.municipalityName} with ${ds.wards.length} verified wards (${ds.wards.map(w => w.wardNumber).join(', ')}).`);
            }}
            className="py-2.5 px-4 bg-slate-900 hover:bg-slate-750 border border-slate-700 text-slate-300 rounded-xl font-medium text-center"
          >
            Inspect Active Wards ({wardBoundaryService.getDataset().wards.map(w => w.wardNumber).join(', ')})
          </button>
        </div>
      </div>

      {/* Section 6: Database Safety & Backup */}
      <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700 shadow-md space-y-4">
        <h2 className="text-sm font-bold text-blue-400 flex items-center gap-2 border-b border-slate-700 pb-2">
          <Database className="w-4 h-4" />
          Data Safety, Backup &amp; Restore
        </h2>

        <p className="text-xs text-slate-400">
          All records, worker roster, categories, and photos are saved securely on your device. You can export a full JSON backup to safeguard your records or transfer to another phone.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleExportBackup}
            className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{getTranslation(language, 'exportBackup')}</span>
          </button>

          <label className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer text-center">
            <Upload className="w-4 h-4 text-sky-400" />
            <span>{getTranslation(language, 'importBackup')}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
