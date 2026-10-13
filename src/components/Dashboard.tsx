import React, { useState, useEffect } from 'react';
import {
  Camera,
  MapPin,
  Users,
  FolderKanban,
  Images,
  History,
  FileText,
  Settings,
  AlertTriangle,
  RefreshCw,
  Clock,
  Calendar,
  CheckCircle2,
  Navigation,
  Crosshair,
  UserCheck,
  Briefcase,
  Map as MapIcon,
} from 'lucide-react';
import { Language, LocationData, AddressData, Worker, WorkCategory, AppSettings } from '../types';
import { getTranslation } from '../i18n/translations';
import { MapView } from './MapView';
import { formatTime12Hour } from '../utils/timeFormat';

interface DashboardProps {
  language: Language;
  location: LocationData | null;
  address: AddressData | null;
  workers: Worker[];
  categories: WorkCategory[];
  photosCount: number;
  settings: AppSettings;
  selectedWorkerId: string;
  onSelectWorkerId: (id: string) => void;
  selectedCategoryId: string;
  onSelectCategoryId: (id: string) => void;
  selectedWard: string;
  onSelectWard: (ward: string) => void;
  onRefreshGps: () => void;
  onNavigate: (screen: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  language,
  location,
  address,
  workers,
  categories,
  photosCount,
  settings,
  selectedWorkerId,
  onSelectWorkerId,
  selectedCategoryId,
  onSelectCategoryId,
  selectedWard,
  onSelectWard,
  onRefreshGps,
  onNavigate,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showMapPreview, setShowMapPreview] = useState<boolean>(false);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedWorker = workers.find((w) => w.id === selectedWorkerId);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const isAccuracyLow = location && location.status === 'current' && location.accuracy > settings.minGpsAccuracy;
  const isGpsActive = location && location.status === 'current';

  const formattedDate = currentTime.toLocaleDateString(language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = formatTime12Hour(currentTime);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Welcome Hero / Status Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-5 rounded-2xl border border-slate-700/80 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/20 text-blue-300 text-xs font-semibold mb-2">
              <Crosshair className="w-3.5 h-3.5 animate-pulse text-blue-400" />
              <span>Sumit Boss • Location & Worker System</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {getTranslation(language, 'appName')}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              {getTranslation(language, 'appSubtitle')}
            </p>
          </div>

          {/* Live Date / Clock Card */}
          <div className="flex items-center gap-3 bg-slate-950/60 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-800 self-start md:self-auto">
            <div className="p-2.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                <Calendar className="w-3 h-3" />
                <span>{formattedDate}</span>
              </div>
              <div className="text-lg font-mono font-bold text-white tracking-wide">
                {formattedTime}
              </div>
            </div>
          </div>
        </div>

        {/* GPS Live Status Bar */}
        <div className="mt-5 pt-4 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* GPS Status */}
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-slate-400 font-medium mb-1 flex items-center justify-between">
              <span>{getTranslation(language, 'gpsStatus')}</span>
              <Navigation className={`w-3.5 h-3.5 ${isGpsActive ? 'text-emerald-400' : 'text-amber-400'}`} />
            </div>
            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isGpsActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`}
              />
              <span className="truncate font-mono text-[11px] text-emerald-400">
                {location?.gpsStatusText || (isGpsActive ? 'GPS FIX ACQUIRED' : 'WAITING FOR GPS')}
              </span>
            </div>
          </div>

          {/* Accuracy & Heading */}
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-slate-400 font-medium mb-1 flex items-center justify-between">
              <span>{getTranslation(language, 'accuracy')}</span>
              <span className="text-[10px] text-sky-400 font-mono">
                {location?.compassDirection || 'Heading N/A'}
              </span>
            </div>
            <div className={`font-mono font-bold text-sm ${isAccuracyLow ? 'text-rose-400' : 'text-emerald-400'}`}>
              {location?.accuracy ? `±${location.accuracy} ${getTranslation(language, 'meters')}` : 'Calculating...'}
            </div>
          </div>

          {/* Selected Worker */}
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-slate-400 font-medium mb-1 flex items-center justify-between">
              <span>{getTranslation(language, 'selectedWorker')}</span>
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="font-semibold text-slate-200 truncate">
              {selectedWorker ? selectedWorker.name : getTranslation(language, 'noneSelected')}
            </div>
          </div>

          {/* Photos Saved Count */}
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-slate-400 font-medium mb-1 flex items-center justify-between">
              <span>{getTranslation(language, 'photosSaved')}</span>
              <Images className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="font-bold text-sm text-indigo-300">
              {photosCount} Photos
            </div>
          </div>
        </div>

        {/* GPS Low Accuracy Warning Notice */}
        {isAccuracyLow && (
          <div className="mt-3 bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5 text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{getTranslation(language, 'accuracyWarning')}</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Current accuracy is ±{location.accuracy}m (Threshold: {settings.minGpsAccuracy}m).
              </p>
            </div>
            <button
              onClick={onRefreshGps}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold rounded text-xs transition-colors shrink-0 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{getTranslation(language, 'refresh')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick Setup Strip (Worker, Category & Ward for current capture session) */}
      <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/80 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        <div className="w-full md:w-auto flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {/* Quick Worker Select */}
          <div>
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>{getTranslation(language, 'selectWorkerPrompt')}</span>
            </label>
            <select
              value={selectedWorkerId}
              onChange={(e) => onSelectWorkerId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="">-- {getTranslation(language, 'noneSelected')} --</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.designation || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Category Select */}
          <div>
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
              <span>{getTranslation(language, 'selectCategoryPrompt')}</span>
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => onSelectCategoryId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">-- {getTranslation(language, 'noneSelected')} --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {language === 'mr' ? c.nameMr : language === 'hi' ? c.nameHi : c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Ward Input */}
          <div>
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>{getTranslation(language, 'wardPrompt')}</span>
            </label>
            <input
              type="text"
              value={selectedWard}
              onChange={(e) => onSelectWard(e.target.value)}
              placeholder="e.g. Ward 1 / Zone 2 (or auto GPS)"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
            />
          </div>
        </div>

        {/* Toggle Map Preview & GPS Refresh */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setShowMapPreview(!showMapPreview)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              showMapPreview
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>{showMapPreview ? 'Hide Map' : 'Show Map'}</span>
          </button>
          <button
            onClick={onRefreshGps}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-750 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Refresh GPS Fix"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>GPS Fix</span>
          </button>
        </div>
      </div>

      {/* Optional Live Map Drawer */}
      {showMapPreview && (
        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              Live Field Map Preview
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              {address?.fullAddress ? address.fullAddress.substring(0, 50) + '...' : 'Acquiring Address...'}
            </span>
          </div>
          <MapView
            latitude={location?.latitude || 19.076}
            longitude={location?.longitude || 72.8777}
            accuracy={location?.accuracy}
            className="h-60 rounded-lg"
          />
        </div>
      )}

      {/* Main 8 Dashboard Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Open Camera */}
        <button
          onClick={() => onNavigate('camera')}
          className="group relative bg-gradient-to-br from-blue-700 to-indigo-900 hover:from-blue-600 hover:to-indigo-800 p-5 rounded-2xl border border-blue-500/40 shadow-lg text-left transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            1. {getTranslation(language, 'openCamera')}
          </h2>
          <p className="text-xs text-blue-200 mt-1 leading-relaxed">
            Live viewfinder with real-time GPS telemetry overlay &amp; controls.
          </p>
        </button>

        {/* 2. Capture GPS Photo */}
        <button
          onClick={() => onNavigate('camera')}
          className="group relative bg-gradient-to-br from-emerald-700 to-teal-900 hover:from-emerald-600 hover:to-teal-800 p-5 rounded-2xl border border-emerald-500/40 shadow-lg text-left transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Crosshair className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            2. {getTranslation(language, 'captureGpsPhoto')}
          </h2>
          <p className="text-xs text-emerald-200 mt-1 leading-relaxed">
            Instantly capture &amp; bake verified coordinates and address into photo.
          </p>
        </button>

        {/* 3. Worker Management */}
        <button
          onClick={() => onNavigate('workers')}
          className="group relative bg-slate-800/90 hover:bg-slate-750 p-5 rounded-2xl border border-slate-700 hover:border-slate-600 shadow-md text-left transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            3. {getTranslation(language, 'workerManagement')}
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Manage worker roster, designations, phone numbers, and wards.
          </p>
        </button>

        {/* 4. Work Category Management */}
        <button
          onClick={() => onNavigate('categories')}
          className="group relative bg-slate-800/90 hover:bg-slate-750 p-5 rounded-2xl border border-slate-700 hover:border-slate-600 shadow-md text-left transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-indigo-400">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            4. {getTranslation(language, 'categoryManagement')}
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Manage work tasks (Drain Cleaning, Sweeping, Road Cleaning, etc.).
          </p>
        </button>

        {/* 5. Saved Photos */}
        <button
          onClick={() => onNavigate('gallery')}
          className="group relative bg-slate-800/90 hover:bg-slate-750 p-5 rounded-2xl border border-slate-700 hover:border-slate-600 shadow-md text-left transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="w-12 h-12 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-sky-400">
            <Images className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            5. {getTranslation(language, 'savedPhotos')}
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Browse stamped and original photos, search, and export to gallery.
          </p>
        </button>

        {/* 6. Location History */}
        <button
          onClick={() => onNavigate('history')}
          className="group relative bg-slate-800/90 hover:bg-slate-750 p-5 rounded-2xl border border-slate-700 hover:border-slate-600 shadow-md text-left transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-violet-400">
            <History className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            6. {getTranslation(language, 'locationHistory')}
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Inspect map markers, coordinate trails, and GPS fix timestamps.
          </p>
        </button>

        {/* 7. Photo Reports */}
        <button
          onClick={() => onNavigate('reports')}
          className="group relative bg-slate-800/90 hover:bg-slate-750 p-5 rounded-2xl border border-slate-700 hover:border-slate-600 shadow-md text-left transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-amber-400">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            7. {getTranslation(language, 'photoReports')}
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Generate printable A4 PDF audit reports with thumbnails and tables.
          </p>
        </button>

        {/* 8. Application Settings */}
        <button
          onClick={() => onNavigate('settings')}
          className="group relative bg-slate-800/90 hover:bg-slate-750 p-5 rounded-2xl border border-slate-700 hover:border-slate-600 shadow-md text-left transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-700/40 border border-slate-600/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-slate-300">
            <Settings className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            8. {getTranslation(language, 'applicationSettings')}
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Configure overlay styles, GPS accuracy limit, speech TTS, and backup.
          </p>
        </button>
      </div>
    </div>
  );
};
