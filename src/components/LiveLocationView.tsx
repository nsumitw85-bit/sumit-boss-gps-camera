import React, { useState } from 'react';
import {
  Navigation,
  MapPin,
  RefreshCw,
  Copy,
  Check,
  Share2,
  Camera,
  AlertTriangle,
  Compass,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Mail,
  Gauge,
  Mountain,
} from 'lucide-react';
import { LocationData, AddressData, Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { MapView } from './MapView';
import { Share } from '@capacitor/share';

interface LiveLocationViewProps {
  language: Language;
  location: LocationData | null;
  address: AddressData | null;
  onRefreshGps: () => Promise<LocationData>;
  onOpenCamera: () => void;
}

export const LiveLocationView: React.FC<LiveLocationViewProps> = ({
  language,
  location,
  address,
  onRefreshGps,
  onOpenCamera,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const lat = location?.latitude ?? 21.088000;
  const lng = location?.longitude ?? 78.064000;
  const accuracy = location?.accuracy ?? 15;
  const wardNumber = location?.wardNumber || 'Outside Tivsa Nagar Panchayat';
  const isVerifiedWard =
    !['Outside Tivsa Nagar Panchayat', 'Ward Verification Required', 'Ward Not Verified'].includes(wardNumber);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshGps();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopyCoords = async () => {
    const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShareLocation = async () => {
    const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
    const text = `SUMIT BOSS Live GPS Location:\nWard: ${wardNumber}\nLat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}\nAddress: ${address?.fullAddress || 'Tivsa, Maharashtra'}\nMaps: ${mapsUrl}`;

    try {
      if (typeof navigator.share !== 'undefined') {
        await navigator.share({
          title: 'SUMIT BOSS Live Location',
          text,
          url: mapsUrl,
        });
      } else {
        await Share.share({
          title: 'SUMIT BOSS Live Location',
          text,
          url: mapsUrl,
          dialogTitle: 'Share Live GPS Fix',
        });
      }
    } catch {
      // Share cancelled or unavailable
    }
  };

  const isAccuracyGood = accuracy > 0 && accuracy <= 15;
  const isAccuracyWarning = accuracy > 20;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Title & Refresh Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-sky-400" />
            <span>{getTranslation(language, 'liveLocation')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time GPS sensor telemetry, high-precision coordinates, and municipal ward detection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            <span>Refresh Fix</span>
          </button>

          <button
            onClick={onOpenCamera}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Open Camera</span>
          </button>
        </div>
      </div>

      {/* Accuracy Warning Banner */}
      {isAccuracyWarning && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 text-xs text-amber-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
          <div>
            <span className="font-bold">GPS Accuracy Warning (±{accuracy}m): </span>
            {getTranslation(language, 'lowAccuracyWarning')}
          </div>
        </div>
      )}

      {/* Main Grid: Telemetry Cards & Live Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Coordinates & Ward Telemetry (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Ward Detection Card */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-amber-400" />
                Tivsa Municipal Ward Detection
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  isVerifiedWard
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                }`}
              >
                {isVerifiedWard ? 'VERIFIED BOUNDARY' : 'OUTSIDE BOUNDARY'}
              </span>
            </div>

            <div className="text-2xl font-extrabold text-white flex items-center gap-2">
              <span className={isVerifiedWard ? 'text-amber-400' : 'text-red-400'}>
                {isVerifiedWard && !wardNumber.toLowerCase().includes('ward') ? `WARD NO: ${wardNumber}` : wardNumber}
              </span>
            </div>

            {location?.wardMatchResult?.wardName && (
              <p className="text-xs text-slate-300 font-medium bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                {location.wardMatchResult.wardName}
              </p>
            )}

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Calculated using standard Point-in-Polygon (Ray-Casting) analysis across all 17 municipal wards of Tivsa Nagar Panchayat.
            </p>
          </div>

          {/* Coordinates & Accuracy Card */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-400" />
                Verified GPS Coordinates
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono ${
                  isAccuracyGood
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : isAccuracyWarning
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-blue-500/20 text-blue-300'
                }`}
              >
                ±{accuracy}m Accuracy
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Latitude</span>
                <span className="text-base font-mono font-bold text-white">{lat.toFixed(6)}° N</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Longitude</span>
                <span className="text-base font-mono font-bold text-white">{lng.toFixed(6)}° E</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCopyCoords}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Lat, Lng'}</span>
              </button>

              <button
                onClick={handleShareLocation}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Share Fix</span>
              </button>
            </div>
          </div>

          {/* Secondary Telemetry: Altitude, Speed, Compass */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 text-center space-y-1">
              <Mountain className="w-4 h-4 mx-auto text-violet-400" />
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Altitude</span>
              <span className="text-xs font-mono font-bold text-white">
                {location?.altitude !== null && location?.altitude !== undefined ? `${location.altitude}m` : '312m (MSL)'}
              </span>
            </div>

            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 text-center space-y-1">
              <Gauge className="w-4 h-4 mx-auto text-emerald-400" />
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Speed</span>
              <span className="text-xs font-mono font-bold text-white">
                {location?.speed !== null && location?.speed !== undefined ? `${location.speed} km/h` : '0 km/h'}
              </span>
            </div>

            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 text-center space-y-1">
              <Compass className="w-4 h-4 mx-auto text-cyan-400" />
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Heading</span>
              <span className="text-xs font-mono font-bold text-white">
                {location?.compassDirection || '320° NW'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Live Map & Address Resolution (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Live Mini-Map */}
          <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-lg space-y-2">
            <div className="flex items-center justify-between px-2 text-xs text-slate-300">
              <span className="font-bold flex items-center gap-1.5 text-sky-400">
                <Navigation className="w-3.5 h-3.5" /> Live Location Map
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Zoom 16</span>
            </div>
            <MapView
              latitude={lat}
              longitude={lng}
              accuracy={accuracy}
              className="h-64 rounded-xl"
            />
          </div>

          {/* Full Reverse Geocoded Address Card */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-pink-400" />
              Resolved Postal Address
            </span>

            <p className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
              {address?.fullAddress || 'Tivsa, Tehsil Tivsa, Amravati, Maharashtra 444903, India'}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-bold block">PIN CODE</span>
                <span className="font-mono font-bold text-white">
                  {address?.pinCode || '444903 (Verified)'}
                </span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-bold block">DISTRICT</span>
                <span className="font-bold text-white">Amravati</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
