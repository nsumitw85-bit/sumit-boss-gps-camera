import React, { useState } from 'react';
import {
  Map as MapIcon,
  Navigation,
  Layers,
  Camera,
  Eye,
  EyeOff,
  Building2,
  Images,
  MapPin,
  Compass,
} from 'lucide-react';
import { LocationData, CapturedPhoto, Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { MapView, MapMarkerItem, MapPolygonItem } from './MapView';
import { wardBoundaryService } from '../services/wardBoundaryService';

interface GoogleMapViewProps {
  language: Language;
  location: LocationData | null;
  photos: CapturedPhoto[];
  onOpenCamera: () => void;
}

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  language,
  location,
  photos,
  onOpenCamera,
}) => {
  const [showWards, setShowWards] = useState(true);
  const [showPhotos, setShowPhotos] = useState(true);
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>('all');

  const dataset = wardBoundaryService.getDataset();
  const tivsaWards = dataset.wards;

  // Center on user if available, otherwise Tivsa Nagar Panchayat center
  const userLat = location?.latitude && location.status === 'current' ? location.latitude : 21.0880;
  const userLng = location?.longitude && location.status === 'current' ? location.longitude : 78.0640;
  const accuracy = location?.accuracy || 15;

  // Map Ward Polygons
  const polygonItems: MapPolygonItem[] = showWards
    ? tivsaWards
        .filter((w) => selectedWardFilter === 'all' || w.wardNumber === selectedWardFilter)
        .map((w) => ({
          id: w.wardNumber,
          name: w.wardName || w.wardNumber,
          coordinates: w.coordinates,
          color: w.color || '#3b82f6',
          fillOpacity: 0.22,
        }))
    : [];

  // Map Photo Markers
  const markerItems: MapMarkerItem[] = showPhotos
    ? photos
        .filter((p) => selectedWardFilter === 'all' || p.wardNumber === selectedWardFilter)
        .map((p) => ({
          latitude: p.location.latitude,
          longitude: p.location.longitude,
          title: `${p.wardNumber || 'Photo'} (${p.captureDateStr})`,
          description: `Time: ${p.captureTimeStr}<br/>Address: ${p.address?.fullAddress || 'Tivsa'}`,
          thumbnailUrl: p.thumbnailDataUrl || p.stampedDataUrl,
        }))
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      {/* Top Header & Layer Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-sky-400" />
            <span>{getTranslation(language, 'googleMaps')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Official Tivsa Nagar Panchayat 17-Ward GIS boundaries and geotagged field photos.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Ward Toggle */}
          <button
            onClick={() => setShowWards(!showWards)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
              showWards
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>17 Wards {showWards ? 'ON' : 'OFF'}</span>
          </button>

          {/* Photo Markers Toggle */}
          <button
            onClick={() => setShowPhotos(!showPhotos)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
              showPhotos
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Images className="w-3.5 h-3.5" />
            <span>Photos ({photos.length})</span>
          </button>

          {/* Open in Google Maps */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${userLat},${userLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition-all border border-emerald-500/50"
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-200" />
            <span>Open in Google Maps</span>
          </a>

          {/* Camera Launch */}
          <button
            onClick={onOpenCamera}
            className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-all"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>GPS Camera</span>
          </button>
        </div>
      </div>

      {/* Ward Filter Select Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          onClick={() => setSelectedWardFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
            selectedWardFilter === 'all'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
          }`}
        >
          All 17 Wards
        </button>

        {tivsaWards.map((ward) => (
          <button
            key={ward.id}
            onClick={() => setSelectedWardFilter(ward.wardNumber)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedWardFilter === ward.wardNumber
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: ward.color || '#3b82f6' }}
            />
            <span>{ward.wardNumber}</span>
          </button>
        ))}
      </div>

      {/* Main Interactive Map Container */}
      <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-2xl space-y-2">
        <MapView
          latitude={userLat}
          longitude={userLng}
          accuracy={accuracy}
          markers={markerItems}
          polygons={polygonItems}
          className="h-[65vh] w-full rounded-xl"
        />

        {/* Map Legend Footer */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-2 pt-1 gap-2 border-t border-slate-800/80">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              Live GPS Fix (±{accuracy}m)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/60 border border-amber-400" />
              Tivsa Nagar Panchayat Wards 1–17
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              Geotagged Photo ({photos.length})
            </span>
          </div>

          <div className="font-mono text-slate-500">
            Tehsil Tivsa • Dist. Amravati • 444903
          </div>
        </div>
      </div>
    </div>
  );
};
