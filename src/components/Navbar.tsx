import React from 'react';
import { Camera, Navigation, Settings as SettingsIcon } from 'lucide-react';
import { Language, LocationData } from '../types';
import { getTranslation } from '../i18n/translations';

interface NavbarProps {
  language: Language;
  location: LocationData | null;
  onHomeClick: () => void;
  onOpenSettings?: () => void;
  activeScreen: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  language,
  location,
  onHomeClick,
  onOpenSettings,
  activeScreen,
}) => {
  const isGpsGood = location && location.status === 'current' && location.accuracy <= 25;
  const isGpsModerate = location && location.status === 'current' && location.accuracy > 25;

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 py-2 sm:px-4 sm:py-2.5 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Logo and App Title */}
        <button
          onClick={onHomeClick}
          className="flex items-center gap-2 sm:gap-2.5 text-left group focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1 -m-1"
          aria-label="Sumit Boss Home Dashboard"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-400 p-0.5 shadow-md shadow-blue-900/40 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950/40 rounded-[10px] flex items-center justify-center">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-sky-200 group-hover:scale-105 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white leading-none">
                SUMIT BOSS
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                PRO GPS
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium leading-none mt-0.5">
              {getTranslation(language, 'appSubtitle')}
            </p>
          </div>
        </button>

        {/* Right Header: Clean & Simple (GPS Telemetry Pill + Settings shortcut) */}
        <div className="flex items-center gap-2">
          {/* GPS Telemetry Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${
              isGpsGood
                ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
                : isGpsModerate
                ? 'bg-amber-950/50 border-amber-500/30 text-amber-300'
                : 'bg-rose-950/50 border-rose-500/30 text-rose-300'
            }`}
            title={`GPS Status: ${location?.status || 'Unknown'} (±${location?.accuracy || '?'}m)`}
          >
            <Navigation className={`w-3.5 h-3.5 ${location?.status === 'current' ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="font-semibold text-[11px]">
              {location?.status === 'current' ? `±${location.accuracy}m` : location?.status === 'acquiring' ? 'Fixing...' : 'No Fix'}
            </span>
          </div>

          {/* Quick Settings Shortcut button */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className={`p-2 rounded-lg border transition-colors ${
                activeScreen === 'settings'
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750'
              }`}
              title="Open Settings (Language, Sound, Camera & GPS)"
              aria-label="Open Settings"
            >
              <SettingsIcon className="w-4 h-4 text-sky-400" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
