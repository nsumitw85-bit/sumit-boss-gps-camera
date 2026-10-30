import React, { useState } from 'react';
import {
  Images,
  Search,
  Trash2,
  Share2,
  Download,
  Eye,
  Calendar,
  MapPin,
  Clock,
  X,
  AlertTriangle,
  Building2,
  CheckCircle,
  Loader2,
  Camera,
} from 'lucide-react';
import { CapturedPhoto, Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { dbService } from '../services/db';
import { MapView } from './MapView';
import { PhotoExportService } from '../services/photoExportService';

interface PhotoGalleryProps {
  language: Language;
  photos: CapturedPhoto[];
  onRefresh: () => void;
  onBack: () => void;
  onOpenCamera?: () => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  language,
  photos,
  onRefresh,
  onBack,
  onOpenCamera,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWard, setFilterWard] = useState('all');
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [activeExportId, setActiveExportId] = useState<string | null>(null);
  const [toastFeedback, setToastFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastFeedback({ type, message });
    if (type === 'success') {
      setTimeout(() => {
        setToastFeedback(null);
      }, 3500);
    }
  };

  // Distinct wards present in captured photos
  const availableWards = Array.from(
    new Set(photos.map((p) => p.wardNumber).filter(Boolean) as string[])
  ).sort();

  const filteredPhotos = photos.filter((p) => {
    const matchesSearch =
      searchTerm === '' ||
      p.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.address.fullAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.wardNumber && p.wardNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesWard = filterWard === 'all' || p.wardNumber === filterWard;

    return matchesSearch && matchesWard;
  });

  const handleDelete = async (id: string) => {
    await dbService.deletePhoto(id);
    setDeletingId(null);
    if (selectedPhoto?.id === id) {
      setSelectedPhoto(null);
    }
    onRefresh();
    showToast('success', 'Photo removed.');
  };

  const handleDownloadPhoto = async (photo: CapturedPhoto) => {
    setIsExporting(true);
    setActiveExportId(photo.id);
    try {
      const res = await PhotoExportService.savePhotoToDevice(photo.stampedDataUrl, photo.filename);
      showToast('success', res.message || 'Photo saved successfully to Gallery.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save photo.');
    } finally {
      setIsExporting(false);
      setActiveExportId(null);
    }
  };

  const handleSharePhoto = async (photo: CapturedPhoto) => {
    setIsExporting(true);
    setActiveExportId(photo.id);
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
      showToast('success', 'Shared successfully via WhatsApp.');
    } catch (err: any) {
      showToast('error', err.message || 'WhatsApp sharing failed.');
    } finally {
      setIsExporting(false);
      setActiveExportId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Images className="w-5 h-5 text-sky-400" />
            <span>{getTranslation(language, 'photoGallery')}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-600/30 text-sky-300 font-mono font-bold">
              {photos.length}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse and export high-resolution GPS-stamped field documentation photographs.
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

      {/* Toast Feedback */}
      {toastFeedback && (
        <div
          className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg ${
            toastFeedback.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/60'
              : 'bg-red-950/90 text-red-300 border border-red-700/60'
          }`}
        >
          {toastFeedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          )}
          <span>{toastFeedback.message}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by address, coordinates, ward, or filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Ward Filter Select */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
            <select
              value={filterWard}
              onChange={(e) => setFilterWard(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors w-full sm:w-auto"
            >
              <option value="all">All Wards ({photos.length})</option>
              {availableWards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Photos Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <Images className="w-12 h-12 mx-auto text-slate-600" />
          <p className="text-sm font-medium">No photographs found matching your criteria.</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPhotos.map((photo) => {
            const isProcessingThis = isExporting && activeExportId === photo.id;

            return (
              <div
                key={photo.id}
                className="group bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-lg hover:border-slate-700 transition-all flex flex-col"
              >
                {/* Photo Thumbnail */}
                <div
                  onClick={() => setSelectedPhoto(photo)}
                  className="relative aspect-video bg-black cursor-pointer overflow-hidden"
                >
                  <img
                    src={photo.thumbnailDataUrl || photo.stampedDataUrl}
                    alt={photo.filename}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Top Ward Badge */}
                  <div className="absolute top-2 left-2 z-10">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow backdrop-blur-md ${
                        photo.wardNumber?.includes('Outside') ||
                        photo.wardNumber?.includes('Required') ||
                        photo.wardNumber?.includes('Not Verified')
                          ? 'bg-red-950/85 text-red-300 border border-red-700/50'
                          : 'bg-slate-950/85 text-amber-300 border border-amber-500/50'
                      }`}
                    >
                      {photo.wardNumber &&
                      !photo.wardNumber.toLowerCase().includes('ward') &&
                      !photo.wardNumber.toLowerCase().includes('outside') &&
                      !photo.wardNumber.toLowerCase().includes('required')
                        ? `Ward No. ${photo.wardNumber}`
                        : photo.wardNumber || 'Outside Tivsa'}
                    </span>
                  </div>

                  {/* Accuracy Badge */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-950/85 text-emerald-300 border border-emerald-500/40 shadow backdrop-blur-md">
                      ±{photo.location.accuracy}m
                    </span>
                  </div>

                  {/* Overlay Eye Prompt */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="px-3 py-1 bg-slate-900/90 rounded-full text-white text-[11px] font-semibold flex items-center gap-1.5 shadow">
                      <Eye className="w-3.5 h-3.5" /> Full Resolution
                    </span>
                  </div>
                </div>

                {/* Metadata Body */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Calendar className="w-3 h-3 text-orange-400" />
                      <span>{photo.captureDateStr}</span>
                      <span className="text-slate-600">•</span>
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>{photo.captureTimeStr}</span>
                    </div>

                    <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                      {photo.address.fullAddress}
                    </p>

                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-red-400" />
                      <span>
                        {photo.location.latitude.toFixed(5)}°, {photo.location.longitude.toFixed(5)}°
                      </span>
                    </div>
                  </div>

                  {/* Card Action Buttons: Download & WhatsApp Share */}
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5">
                    <button
                      onClick={() => handleDownloadPhoto(photo)}
                      disabled={isProcessingThis}
                      className="flex-1 py-1.5 px-2 bg-blue-600/20 hover:bg-blue-600/30 text-sky-300 border border-blue-500/30 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                      title="Save to Mobile Gallery"
                    >
                      {isProcessingThis ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      <span>Download</span>
                    </button>

                    <button
                      onClick={() => handleSharePhoto(photo)}
                      disabled={isProcessingThis}
                      className="flex-1 py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                      title="Share to WhatsApp"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => setDeletingId(photo.id)}
                      className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl border border-slate-700 transition-colors"
                      title="Delete photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-500/20 text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Delete Photo?</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white shadow transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Resolution Inspection Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 overflow-y-auto">
          {/* Modal Header */}
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3 border-b border-slate-800">
            <div>
              <span className="font-bold text-sm block">Full Resolution GPS Photo</span>
              <span className="text-[11px] text-slate-400 font-mono">
                {selectedPhoto.captureDateStr} • {selectedPhoto.captureTimeStr}
              </span>
            </div>

            <button
              onClick={() => setSelectedPhoto(null)}
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Image Display */}
          <div className="flex-1 max-w-4xl w-full flex items-center justify-center my-3">
            <img
              src={selectedPhoto.stampedDataUrl}
              alt="High-Res Stamped Photo"
              className="max-h-[66vh] w-auto object-contain rounded-xl shadow-2xl border border-slate-800"
            />
          </div>

          {/* Action Bar */}
          <div className="w-full max-w-4xl bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-300 text-center sm:text-left">
              <span className="font-bold text-amber-300">{selectedPhoto.wardNumber}</span>
              <span className="text-slate-500 mx-1">•</span>
              <span className="font-mono text-slate-400">
                {selectedPhoto.location.latitude.toFixed(6)}°, {selectedPhoto.location.longitude.toFixed(6)}°
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleDownloadPhoto(selectedPhoto)}
                disabled={isExporting}
                className="flex-1 sm:flex-initial py-2.5 px-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download to Gallery</span>
              </button>

              <button
                onClick={() => handleSharePhoto(selectedPhoto)}
                disabled={isExporting}
                className="flex-1 sm:flex-initial py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>Share WhatsApp</span>
              </button>

              <button
                onClick={() => setSelectedPhoto(null)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
