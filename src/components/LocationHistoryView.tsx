import React, { useState } from 'react';
import {
  History,
  MapPin,
  Calendar,
  Clock,
  Eye,
  ArrowLeft,
  Navigation,
  Building2,
  Share2,
  Download,
  ShieldCheck,
  Camera,
} from 'lucide-react';
import { CapturedPhoto, Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { MapView, MapMarkerItem } from './MapView';
import { PhotoExportService } from '../services/photoExportService';

interface LocationHistoryViewProps {
  language: Language;
  photos: CapturedPhoto[];
  onBack: () => void;
  onOpenCamera?: () => void;
}

export const LocationHistoryView: React.FC<LocationHistoryViewProps> = ({
  language,
  photos,
  onBack,
  onOpenCamera,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(photos[0] || null);

  const markers: MapMarkerItem[] = photos.map((p) => ({
    latitude: p.location.latitude,
    longitude: p.location.longitude,
    title: `${p.wardNumber || 'Photo'} (${p.captureDateStr})`,
    description: `Time: ${p.captureTimeStr}<br/>Accuracy: ±${p.location.accuracy}m<br/>${p.address?.fullAddress || ''}`,
    thumbnailUrl: p.thumbnailDataUrl || p.stampedDataUrl,
  }));

  const activeLat = selectedPhoto?.location.latitude || (photos[0]?.location.latitude ?? 21.088000);
  const activeLng = selectedPhoto?.location.longitude || (photos[0]?.location.longitude ?? 78.064000);

  const handleDownload = async (photo: CapturedPhoto) => {
    try {
      await PhotoExportService.savePhotoToDevice(photo.stampedDataUrl, photo.filename);
      alert('Photo saved successfully to Gallery.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleShare = async (photo: CapturedPhoto) => {
    try {
      await PhotoExportService.sharePhotoViaWhatsApp({
        photoDataUrl: photo.stampedDataUrl,
        filename: photo.filename,
        addressText: photo.address?.fullAddress,
        wardNumber: photo.wardNumber,
        latitude: photo.location.latitude,
        longitude: photo.location.longitude,
        timestampStr: `${photo.captureDateStr} ${photo.captureTimeStr}`,
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-violet-400" />
            <span>{getTranslation(language, 'locationHistory')}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-600/30 text-violet-300 font-mono font-bold">
              {photos.length} Points
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Chronological audit trail of all GPS photographic documentation in Tivsa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCamera && (
            <button
              onClick={onOpenCamera}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Capture Photo</span>
            </button>
          )}

          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            {getTranslation(language, 'back')}
          </button>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <MapPin className="w-12 h-12 mx-auto text-slate-600" />
          <p className="text-sm font-medium">No GPS photo history recorded yet. Open camera to capture field evidence!</p>
          {onOpenCamera && (
            <button
              onClick={onOpenCamera}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md"
            >
              Open GPS Camera
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Map Preview on Left/Top (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300 px-1">
                <span className="font-bold flex items-center gap-1.5 text-sky-400">
                  <Navigation className="w-4 h-4" />
                  Field GPS Distribution ({photos.length} Captured Points)
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {selectedPhoto
                    ? `${selectedPhoto.location.latitude.toFixed(5)}°, ${selectedPhoto.location.longitude.toFixed(5)}°`
                    : ''}
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
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    {selectedPhoto.wardNumber &&
                    !selectedPhoto.wardNumber.toLowerCase().includes('ward') &&
                    !selectedPhoto.wardNumber.toLowerCase().includes('outside') &&
                    !selectedPhoto.wardNumber.toLowerCase().includes('required')
                      ? `Ward No. ${selectedPhoto.wardNumber}`
                      : selectedPhoto.wardNumber || 'Outside Tivsa'}
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">
                    ±{selectedPhoto.location.accuracy}m Accuracy
                  </span>
                </div>

                <p className="text-slate-200 leading-relaxed text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {selectedPhoto.address.fullAddress}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>
                    Captured: {selectedPhoto.captureDateStr} at {selectedPhoto.captureTimeStr}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(selectedPhoto)}
                      className="px-2.5 py-1 bg-blue-600/20 text-sky-300 border border-blue-500/30 rounded-lg font-bold flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Save
                    </button>
                    <button
                      onClick={() => handleShare(selectedPhoto)}
                      className="px-2.5 py-1 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold flex items-center gap-1"
                    >
                      <Share2 className="w-3 h-3" /> Share
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timeline List on Right (5 cols) */}
          <div className="lg:col-span-5 space-y-3 max-h-[640px] overflow-y-auto pr-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Location Audit Trail (Newest First)
            </h3>

            {photos.map((photo, idx) => {
              const isSelected = selectedPhoto?.id === photo.id;

              return (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500/60 shadow-md'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <img
                    src={photo.thumbnailDataUrl || photo.stampedDataUrl}
                    alt="Thumbnail"
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-800 bg-black"
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-300 truncate">
                        {photo.wardNumber &&
                        !photo.wardNumber.toLowerCase().includes('ward') &&
                        !photo.wardNumber.toLowerCase().includes('outside') &&
                        !photo.wardNumber.toLowerCase().includes('required')
                          ? `Ward No. ${photo.wardNumber}`
                          : photo.wardNumber || 'Outside Tivsa'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {photo.captureTimeStr}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 line-clamp-1">
                      {photo.address.fullAddress}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                      <span>{photo.captureDateStr}</span>
                      <span className="text-emerald-400">±{photo.location.accuracy}m</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
