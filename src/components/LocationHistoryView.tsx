import React, { useState } from 'react';
import {
  History,
  MapPin,
  Calendar,
  Clock,
  User,
  Briefcase,
  ChevronRight,
  Eye,
  ArrowLeft,
  Navigation,
} from 'lucide-react';
import { CapturedPhoto, Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { MapView } from './MapView';
import { normalizeTime12Hour } from '../utils/timeFormat';

interface LocationHistoryViewProps {
  language: Language;
  photos: CapturedPhoto[];
  onBack: () => void;
}

export const LocationHistoryView: React.FC<LocationHistoryViewProps> = ({
  language,
  photos,
  onBack,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(photos[0] || null);

  const markers = photos.map((p) => ({
    latitude: p.location.latitude,
    longitude: p.location.longitude,
    title: `${p.workerName || 'Worker'} - ${p.workCategoryName || 'Work'}`,
    description: `Time: ${p.captureDateStr} ${p.captureTimeStr}<br/>Ward: ${p.wardNumber || 'N/A'}<br/>Accuracy: ±${p.location.accuracy}m`,
  }));

  const activeLat = selectedPhoto?.location.latitude || (photos[0]?.location.latitude ?? 19.076);
  const activeLng = selectedPhoto?.location.longitude || (photos[0]?.location.longitude ?? 72.8777);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-md">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-violet-400" />
            <span>{getTranslation(language, 'locationHistory')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Audit trail of all field photography locations, GPS coordinates, and ward timestamps.
          </p>
        </div>

        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition-colors self-start sm:self-auto"
        >
          {getTranslation(language, 'back')}
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <MapPin className="w-12 h-12 mx-auto text-slate-500" />
          <p className="text-sm font-medium">No location history recorded yet. Capture GPS photos to build your trail!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Map Preview on Top/Left (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-300 mb-2 px-1">
                <span className="font-bold flex items-center gap-1.5 text-sky-400">
                  <Navigation className="w-4 h-4" />
                  Field GPS Distribution Map ({photos.length} Captured Points)
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {selectedPhoto ? `${selectedPhoto.location.latitude.toFixed(5)}°, ${selectedPhoto.location.longitude.toFixed(5)}°` : ''}
                </span>
              </div>
              <MapView
                latitude={activeLat}
                longitude={activeLng}
                accuracy={selectedPhoto?.location.accuracy}
                markers={markers}
                className="h-80 sm:h-96 rounded-xl"
              />
            </div>

            {selectedPhoto && (
              <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 shadow-md space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">
                    {selectedPhoto.workerName || 'Worker'} • {selectedPhoto.workCategoryName || 'Work'}
                  </span>
                  <span className="text-emerald-400 font-mono">±{selectedPhoto.location.accuracy}m</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  {selectedPhoto.address.fullAddress}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
                  <span>Ward: {selectedPhoto.wardNumber || 'N/A'}</span>
                  <span>PIN: {selectedPhoto.address.pinCode || 'Unavailable'}</span>
                  <span>{selectedPhoto.captureDateStr} {normalizeTime12Hour(selectedPhoto.captureTimeStr, selectedPhoto.timestamp)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Timeline List on Right (5 cols) */}
          <div className="lg:col-span-5 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 shadow-lg flex flex-col max-h-[580px]">
            <h2 className="font-bold text-sm text-white mb-3 flex items-center justify-between">
              <span>Capture Timeline</span>
              <span className="text-xs text-slate-400 font-normal">{photos.length} records</span>
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {photos.map((photo) => {
                const isSelected = selectedPhoto?.id === photo.id;

                return (
                  <div
                    key={photo.id}
                    onClick={() => setSelectedPhoto(photo)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500/40 text-white'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-lg bg-slate-950 overflow-hidden shrink-0 border border-slate-800">
                        <img
                          src={photo.thumbnailDataUrl || photo.stampedDataUrl}
                          alt="thumb"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate text-white">
                          {photo.workerName || 'Staff'}
                        </p>
                        <p className="text-[11px] text-sky-400 truncate">
                          {photo.workCategoryName || 'Work'} • Ward {photo.wardNumber || 'N/A'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {photo.captureDateStr} {normalizeTime12Hour(photo.captureTimeStr, photo.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono text-emerald-400 block">
                        ±{photo.location.accuracy}m
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500 ml-auto mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
