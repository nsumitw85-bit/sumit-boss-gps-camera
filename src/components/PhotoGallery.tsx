import React, { useState } from 'react';
import {
  Images,
  Search,
  Filter,
  Trash2,
  Share2,
  Download,
  Eye,
  Calendar,
  User,
  Briefcase,
  MapPin,
  Clock,
  X,
  AlertTriangle,
  Layers,
  FileCheck2,
  ExternalLink,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { CapturedPhoto, Worker, WorkCategory, Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { dbService } from '../services/db';
import { MapView } from './MapView';
import { normalizeTime12Hour } from '../utils/timeFormat';
import { PhotoExportService } from '../services/photoExportService';

interface PhotoGalleryProps {
  language: Language;
  photos: CapturedPhoto[];
  workers: Worker[];
  categories: WorkCategory[];
  onRefresh: () => void;
  onBack: () => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  language,
  photos,
  workers,
  categories,
  onRefresh,
  onBack,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWorker, setFilterWorker] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterWard, setFilterWard] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [activeTab, setActiveTab] = useState<'stamped' | 'original'>('stamped');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [activeExportId, setActiveExportId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<'download' | 'share' | null>(null);
  const [toastFeedback, setToastFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    photo?: CapturedPhoto;
    action?: 'download' | 'share';
  } | null>(null);

  const showToast = (
    type: 'success' | 'error',
    message: string,
    photo?: CapturedPhoto,
    action?: 'download' | 'share'
  ) => {
    setToastFeedback({ type, message, photo, action });
    if (type === 'success') {
      setTimeout(() => {
        setToastFeedback((prev) => (prev?.message === message ? null : prev));
      }, 4000);
    }
  };

  // Extract unique wards
  const wards = Array.from(new Set(photos.map((p) => p.wardNumber).filter(Boolean)));

  const filteredPhotos = photos.filter((p) => {
    const matchesSearch =
      searchTerm === '' ||
      p.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.workerName && p.workerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.address.fullAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesWorker = filterWorker === '' || p.workerId === filterWorker;
    const matchesCategory = filterCategory === '' || p.workCategoryId === filterCategory;
    const matchesWard = filterWard === '' || p.wardNumber === filterWard;

    return matchesSearch && matchesWorker && matchesCategory && matchesWard;
  });

  const handleDelete = async (id: string) => {
    await dbService.deletePhoto(id);
    setDeletingId(null);
    if (selectedPhoto?.id === id) {
      setSelectedPhoto(null);
    }
    onRefresh();
  };

  const handleDownload = async (photo: CapturedPhoto, type: 'stamped' | 'original' = 'stamped') => {
    if (isExporting) return;
    const url = type === 'original' && photo.originalDataUrl ? photo.originalDataUrl : photo.stampedDataUrl;
    const filename = type === 'original' ? `Original_${photo.filename}` : photo.filename;

    try {
      setIsExporting(true);
      setActiveExportId(photo.id);
      setActiveAction('download');
      setToastFeedback(null);
      const res = await PhotoExportService.savePhotoToDevice(url, filename);
      showToast('success', res.message || 'Photo saved successfully to Gallery.', photo, 'download');
    } catch (err) {
      console.error('Download error:', err);
      showToast('error', (err as Error)?.message || 'Failed to save photo to Gallery.', photo, 'download');
    } finally {
      setIsExporting(false);
      setActiveExportId(null);
      setActiveAction(null);
    }
  };

  const handleShare = async (photo: CapturedPhoto) => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      setActiveExportId(photo.id);
      setActiveAction('share');
      setToastFeedback(null);
      const res = await PhotoExportService.sharePhotoToWhatsApp(photo.stampedDataUrl, photo.filename);
      showToast('success', res.message || 'Opening WhatsApp...', photo, 'share');
    } catch (err) {
      console.error('Share error:', err);
      showToast('error', (err as Error)?.message || 'Failed to share photo to WhatsApp.', photo, 'share');
    } finally {
      setIsExporting(false);
      setActiveExportId(null);
      setActiveAction(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-md">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Images className="w-6 h-6 text-sky-400" />
            <span>{getTranslation(language, 'galleryTitle')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse and export GPS location-stamped field photos and metadata records.
          </p>
        </div>

        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition-colors self-start sm:self-auto"
        >
          {getTranslation(language, 'back')}
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80 space-y-3 shadow-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by worker, address, filename, or notes..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {/* Worker Filter */}
          <select
            value={filterWorker}
            onChange={(e) => setFilterWorker(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="">{getTranslation(language, 'allWorkers')}</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="">{getTranslation(language, 'allCategories')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {language === 'mr' ? c.nameMr : language === 'hi' ? c.nameHi : c.name}
              </option>
            ))}
          </select>

          {/* Ward Filter */}
          <select
            value={filterWard}
            onChange={(e) => setFilterWard(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="">{getTranslation(language, 'allWards')}</option>
            {wards.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Photos Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <Images className="w-12 h-12 mx-auto text-slate-500" />
          <p className="text-sm font-medium">{getTranslation(language, 'noPhotosFound')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg hover:border-slate-600 transition-all flex flex-col group"
            >
              {/* Thumbnail Container */}
              <div
                onClick={() => setSelectedPhoto(photo)}
                className="relative aspect-video bg-slate-950 cursor-pointer overflow-hidden"
              >
                <img
                  src={photo.thumbnailDataUrl || photo.stampedDataUrl}
                  alt={photo.filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Overlay Badge */}
                <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-mono text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>±{photo.location.accuracy}m</span>
                </div>

                <div className="absolute bottom-2 right-2 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-slate-300">
                  {photo.captureDateStr} {normalizeTime12Hour(photo.captureTimeStr, photo.timestamp)}
                </div>
              </div>

              {/* Photo Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-white truncate max-w-[180px]">
                      {photo.workerName || 'Unassigned'}
                    </span>
                    <span className="text-[11px] text-sky-400 font-semibold px-2 py-0.5 bg-sky-500/10 rounded border border-sky-500/20 truncate max-w-[110px]">
                      {photo.workCategoryName || 'Work'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {photo.address.fullAddress}
                  </p>

                  <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                    <span>Ward: {photo.wardNumber || 'N/A'}</span>
                    <span className={photo.address.isVerifiedPin ? 'text-emerald-400' : 'text-amber-400'}>
                      PIN: {photo.address.pinCode || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedPhoto(photo)}
                    className="flex-1 py-1.5 bg-slate-700/70 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => handleShare(photo)}
                    disabled={isExporting}
                    className="p-1.5 bg-slate-700/70 hover:bg-slate-700 text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
                    title="Share Photo (WhatsApp)"
                  >
                    {isExporting && activeExportId === photo.id && activeAction === 'share' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDownload(photo)}
                    disabled={isExporting}
                    className="p-1.5 bg-slate-700/70 hover:bg-slate-700 text-sky-400 rounded-lg transition-colors disabled:opacity-50"
                    title="Download Photo"
                  >
                    {isExporting && activeExportId === photo.id && activeAction === 'download' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setDeletingId(photo.id)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
                    title="Delete Photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Global Toast Notification for main gallery view */}
      {!selectedPhoto && toastFeedback && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%] pointer-events-auto animate-fade-in">
          <div
            className={`p-3 rounded-2xl border shadow-2xl flex items-center justify-between gap-3 text-xs backdrop-blur-md ${
              toastFeedback.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-200'
                : 'bg-rose-950/95 border-rose-500/60 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {toastFeedback.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span className="font-medium truncate">{toastFeedback.message}</span>
            </div>
            {toastFeedback.type === 'error' && toastFeedback.photo && (
              <button
                onClick={() => {
                  if (toastFeedback.action === 'share') {
                    handleShare(toastFeedback.photo!);
                  } else {
                    handleDownload(toastFeedback.photo!);
                  }
                }}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold shrink-0 transition-colors"
              >
                Retry
              </button>
            )}
            <button
              onClick={() => setToastFeedback(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Full Screen Photo Inspector Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 animate-fade-in overflow-y-auto">
          {/* Top Inspector Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-white">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-wide text-sky-400">
                SUMIT BOSS PHOTO INSPECTOR
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline font-mono">
                ({selectedPhoto.filename})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleShare(selectedPhoto)}
                disabled={isExporting}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isExporting && activeExportId === selectedPhoto.id && activeAction === 'share' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sharing...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleDownload(selectedPhoto, activeTab)}
                disabled={isExporting}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isExporting && activeExportId === selectedPhoto.id && activeAction === 'download' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Inspector Feedback banner */}
          {toastFeedback && (
            <div
              className={`mt-2 p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 animate-fade-in ${
                toastFeedback.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/90 border-rose-500/50 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {toastFeedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className="truncate">{toastFeedback.message}</span>
              </div>
              {toastFeedback.type === 'error' && (
                <button
                  onClick={() => {
                    if (toastFeedback.action === 'share') {
                      handleShare(selectedPhoto);
                    } else {
                      handleDownload(selectedPhoto, activeTab);
                    }
                  }}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold shrink-0 transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
            {/* Image Preview on Left / Center */}
            <div className="lg:col-span-2 flex flex-col space-y-3">
              {/* Switch Stamped vs Original */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('stamped')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'stamped'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Stamped Photo (Watermarked)</span>
                </button>
                {selectedPhoto.originalDataUrl && (
                  <button
                    onClick={() => setActiveTab('original')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      activeTab === 'original'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Original Photo</span>
                  </button>
                )}
              </div>

              <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center p-2 min-h-[340px]">
                <img
                  src={activeTab === 'original' && selectedPhoto.originalDataUrl ? selectedPhoto.originalDataUrl : selectedPhoto.stampedDataUrl}
                  alt={selectedPhoto.filename}
                  className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl"
                />
              </div>
            </div>

            {/* Metadata Inspector Card on Right */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-4 overflow-y-auto max-h-[75vh]">
              <h3 className="font-bold text-sm text-sky-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                <MapPin className="w-4 h-4" />
                Verified Field Telemetry
              </h3>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block">WORKER NAME:</span>
                  <span className="text-amber-300 font-semibold text-sm">
                    {selectedPhoto.workerName || 'Unassigned'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-bold block">WORK CATEGORY:</span>
                  <span className="text-sky-300 font-semibold">{selectedPhoto.workCategoryName || 'General'}</span>
                </div>

                <div>
                  <span className="text-slate-400 font-bold block">WARD &amp; AREA:</span>
                  <span className="text-white">{selectedPhoto.wardNumber || 'N/A'}{selectedPhoto.area ? ` - ${selectedPhoto.area}` : ''}</span>
                </div>

                <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <span className="text-slate-400 font-bold block">LATITUDE:</span>
                    <span className="text-emerald-400">{selectedPhoto.location.latitude.toFixed(6)}°</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">LONGITUDE:</span>
                    <span className="text-emerald-400">{selectedPhoto.location.longitude.toFixed(6)}°</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">GPS ACCURACY:</span>
                    <span className="text-emerald-400">±{selectedPhoto.location.accuracy}m</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">HEADING / BEARING:</span>
                    <span className="text-sky-400">
                      {selectedPhoto.compassDirection || selectedPhoto.location.compassDirection || 'Direction unavailable'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 font-bold block">PIN CODE:</span>
                    <span className={selectedPhoto.address.isVerifiedPin ? 'text-emerald-400' : 'text-amber-400'}>
                      {selectedPhoto.address.pinCode || 'PIN code unavailable'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-400 font-bold block mb-1">VERIFIED ADDRESS:</span>
                  <p className="text-slate-200 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] leading-relaxed">
                    {selectedPhoto.address.fullAddress}
                  </p>
                </div>

                {selectedPhoto.notes && (
                  <div>
                    <span className="text-slate-400 font-bold block mb-1">FIELD NOTES:</span>
                    <p className="text-slate-300 italic bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px]">
                      "{selectedPhoto.notes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Embedded Map Pin for Location */}
              <div className="pt-2">
                <span className="text-slate-400 font-bold block mb-1 text-xs">GPS FIX LOCATION MAP:</span>
                <MapView
                  latitude={selectedPhoto.location.latitude}
                  longitude={selectedPhoto.location.longitude}
                  accuracy={selectedPhoto.location.accuracy}
                  className="h-44 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-sm w-full p-5 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">{getTranslation(language, 'deletePhoto')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getTranslation(language, 'confirmDeletePhoto')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
              >
                {getTranslation(language, 'cancel')}
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
              >
                {getTranslation(language, 'delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
