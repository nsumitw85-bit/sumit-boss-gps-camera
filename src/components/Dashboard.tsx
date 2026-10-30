import React, { useState, useEffect } from 'react';
import {
  Camera,
  Navigation,
  Map as MapIcon,
  Images,
  History,
  Settings as SettingsIcon,
  RefreshCw,
  AlertTriangle,
  Building2,
  Clock,
  Calendar,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { LocationData, AddressData, Language, AppSettings } from '../types';
import { getTranslation } from '../i18n/translations';
import { formatTime12Hour, formatDateDashed } from '../utils/timeFormat';

interface DashboardProps {
  language: Language;
  location: LocationData | null;
  address: AddressData | null;
  photosCount: number;
  settings: AppSettings;
  onRefreshGps: () => Promise<LocationData>;
  onNavigate: (screen: 'camera' | 'live_location' | 'google_maps' | 'gallery' | 'history' | 'settings') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  language,
  location,
  address,
  photosCount,
  settings,
  onRefreshGps,
  onNavigate,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshGps();
    } finally {
      setIsRefreshing(false);
    }
  };

  const accuracy = location?.accuracy || 0;
  const isAccuracyGood = accuracy > 0 && accuracy <= 15;
  const isAccuracyWarning = accuracy > 20;
  const wardNumber = location?.wardNumber || 'Ward Not Verified';
  const isVerifiedWard =
    !['Outside Tivsa Nagar Panchayat', 'Ward Verification Required', 'Ward Not Verified'].includes(wardNumber);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Brand & Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/60 p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-sky-300 font-mono text-[10px] font-extrabold tracking-wider border border-blue-500/30">
                SUMIT BOSS • OFFICIAL GPS CAMERA
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Tivsa Nagar Panchayat
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
              Automated 17-ward GIS detection, high-accuracy GPS stamping, and official municipal photographic documentation.
            </p>
          </div>

          {/* Hero Action: Open Camera */}
          <button
            onClick={() => onNavigate('camera')}
            className="group px-6 py-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 active:scale-98 rounded-2xl font-extrabold text-sm text-white flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30 transition-all shrink-0"
          >
            <Camera className="w-6 h-6 group-hover:scale-110 transition-transform text-white" />
            <div className="text-left">
              <span className="block text-xs uppercase tracking-wider text-sky-200 font-semibold">Ready to Capture</span>
              <span className="text-sm font-bold">Open GPS Camera</span>
            </div>
          </button>
        </div>
      </div>

      {/* Live Telemetry Status Card */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  location?.status === 'current' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  location?.status === 'current' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Live Field Telemetry
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            <span>Refresh Fix</span>
          </button>
        </div>

        {/* Telemetry 4-Pill Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* 1. Ward */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              Detected Ward
            </span>
            <span
              className={`text-sm font-bold block truncate ${
                isVerifiedWard ? 'text-amber-300' : 'text-red-400'
              }`}
            >
              {isVerifiedWard && !wardNumber.toLowerCase().includes('ward') ? `WARD NO: ${wardNumber}` : wardNumber}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {isVerifiedWard ? 'Point-in-Polygon Match' : 'Outside 17 Wards'}
            </span>
          </div>

          {/* 2. GPS Accuracy */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-sky-400" />
              GPS Accuracy
            </span>
            <span
              className={`text-sm font-bold font-mono block ${
                isAccuracyGood
                  ? 'text-emerald-400'
                  : isAccuracyWarning
                  ? 'text-amber-400'
                  : 'text-sky-400'
              }`}
            >
              ±{accuracy} meters
            </span>
            <span className="text-[10px] text-slate-500 block">
              {isAccuracyGood ? 'High Precision' : isAccuracyWarning ? 'Warning: >20m' : 'Standard Fix'}
            </span>
          </div>

          {/* 3. Live 12-Hour Time */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Time (12-Hour)
            </span>
            <span className="text-sm font-bold font-mono text-white block">
              {formatTime12Hour(liveTime)}
            </span>
            <span className="text-[10px] text-slate-500 block">Indian Standard Time</span>
          </div>

          {/* 4. Date */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-orange-400" />
              Date (DD-MM-YYYY)
            </span>
            <span className="text-sm font-bold font-mono text-white block">
              {formatDateDashed(liveTime)}
            </span>
            <span className="text-[10px] text-slate-500 block">Current Field Date</span>
          </div>
        </div>

        {/* Address Banner */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
          <span className="text-red-400 font-bold text-sm shrink-0">📍</span>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-white block">Resolved Location Address:</span>
            <span className="text-[11px] text-slate-400 line-clamp-1">
              {address?.fullAddress || 'Tivsa, Tehsil Tivsa, Amravati, Maharashtra 444903, India'}
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold text-pink-400 shrink-0">
            PIN: {address?.pinCode || '444903'}
          </span>
        </div>
      </div>

      {/* 5 Core Feature Cards Grid */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
          Main Application Features
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Feature 1: GPS Camera */}
          <div
            onClick={() => onNavigate('camera')}
            className="group bg-slate-900/90 hover:bg-slate-850 p-5 rounded-2xl border border-slate-800 hover:border-blue-500/50 shadow-lg cursor-pointer transition-all space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-sky-400 border border-blue-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base group-hover:text-sky-300 transition-colors">
                1. GPS Camera
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Capture high-resolution photographs with the unified single vertical GPS stamp and auto Tivsa ward watermark.
              </p>
            </div>
          </div>

          {/* Feature 2: Live GPS Location */}
          <div
            onClick={() => onNavigate('live_location')}
            className="group bg-slate-900/90 hover:bg-slate-850 p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/50 shadow-lg cursor-pointer transition-all space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">
                2. Live GPS Location
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Real-time coordinates, horizontal accuracy, altitude, speed, compass heading, and municipal ward verification.
              </p>
            </div>
          </div>

          {/* Feature 3: Google Maps */}
          <div
            onClick={() => onNavigate('google_maps')}
            className="group bg-slate-900/90 hover:bg-slate-850 p-5 rounded-2xl border border-slate-800 hover:border-amber-500/50 shadow-lg cursor-pointer transition-all space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MapIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base group-hover:text-amber-300 transition-colors">
                3. Google Maps
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Interactive map displaying all 17 Tivsa Nagar Panchayat ward boundary polygons and geotagged photo markers.
              </p>
            </div>
          </div>

          {/* Feature 4: Photo Gallery */}
          <div
            onClick={() => onNavigate('gallery')}
            className="group bg-slate-900/90 hover:bg-slate-850 p-5 rounded-2xl border border-slate-800 hover:border-violet-500/50 shadow-lg cursor-pointer transition-all space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Images className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base group-hover:text-violet-300 transition-colors">
                  4. Photo Gallery
                </h3>
                <span className="text-xs font-mono font-bold text-violet-400 bg-violet-950/60 px-2 py-0.5 rounded-full border border-violet-800/50">
                  {photosCount} Photos
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Browse, inspect full-resolution photos, download directly to Android gallery, and share instantly on WhatsApp.
              </p>
            </div>
          </div>

          {/* Feature 5: GPS Photo History */}
          <div
            onClick={() => onNavigate('history')}
            className="group bg-slate-900/90 hover:bg-slate-850 p-5 rounded-2xl border border-slate-800 hover:border-pink-500/50 shadow-lg cursor-pointer transition-all space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-pink-600/20 text-pink-400 border border-pink-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base group-hover:text-pink-300 transition-colors">
                5. GPS Photo History
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Chronological location audit trail showing geographic distribution, capture timestamps, and ward logs.
              </p>
            </div>
          </div>

          {/* Settings */}
          <div
            onClick={() => onNavigate('settings')}
            className="group bg-slate-900/90 hover:bg-slate-850 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 shadow-lg cursor-pointer transition-all space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base group-hover:text-slate-200 transition-colors">
                Settings & GIS Setup
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Configure GPS accuracy warning threshold, manage Tivsa 17-ward GeoJSON boundaries, voice, and language.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
