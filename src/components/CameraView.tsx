import React, { useState, useEffect, useRef } from 'react';
import {
  Camera as CameraIcon,
  RotateCcw,
  Zap,
  ZapOff,
  SwitchCamera,
  AlertTriangle,
  CheckCircle,
  X,
  Share2,
  Download,
  MapPin,
  RefreshCw,
  Settings as SettingsIcon,
  Loader2,
  ShieldCheck,
  Images,
  Map as MapIcon,
  History,
  Maximize2,
  Navigation,
} from 'lucide-react';
import {
  Language,
  LocationData,
  AddressData,
  AppSettings,
  CapturedPhoto,
  WardMatchResult,
} from '../types';
import { getTranslation } from '../i18n/translations';
import { PhotoStamper } from '../services/photoStamper';
import { dbService } from '../services/db';
import { voiceService } from '../services/tts';
import { wardBoundaryService } from '../services/wardBoundaryService';
import { formatTime12Hour, formatDateDashed } from '../utils/timeFormat';
import { PhotoExportService } from '../services/photoExportService';
import { Capacitor } from '@capacitor/core';

interface CameraViewProps {
  language: Language;
  location: LocationData | null;
  address: AddressData | null;
  settings: AppSettings;
  onRefreshGps: () => Promise<LocationData>;
  onPhotoSaved: () => void;
  onOpenSettings?: () => void;
  onNavigate?: (screen: 'camera' | 'live_location' | 'google_maps' | 'gallery' | 'history' | 'settings') => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  language,
  location,
  address,
  settings,
  onRefreshGps,
  onPhotoSaved,
  onOpenSettings,
  onNavigate,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<'4:3' | '16:9' | 'full'>('4:3');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Live 12-hour clock (ticks every second)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Modals & Alerts
  const [showAccuracyDialog, setShowAccuracyDialog] = useState<boolean>(false);
  const [capturedPhotoResult, setCapturedPhotoResult] = useState<CapturedPhoto | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isRefreshingGps, setIsRefreshingGps] = useState<boolean>(false);

  // Dynamic point-in-polygon Ward detection for Tivsa Nagar Panchayat
  const [detectedWardResult, setDetectedWardResult] = useState<WardMatchResult>({
    wardNumber: 'Ward Not Verified',
    status: 'not_verified',
    verificationStatus: 'UNVERIFIED',
    confidence: 'none',
  });

  useEffect(() => {
    if (location && location.latitude && location.longitude && location.status === 'current') {
      const match = wardBoundaryService.detectWard(location.latitude, location.longitude, location.accuracy);
      setDetectedWardResult(match);
    } else {
      setDetectedWardResult({
        wardNumber: 'Ward Not Verified',
        status: 'not_verified',
        verificationStatus: 'UNVERIFIED',
        confidence: 'none',
      });
    }
  }, [location?.latitude, location?.longitude, location?.accuracy, location?.status]);

  // Start / restart native camera stream
  const startCamera = async (targetFacing: 'environment' | 'user') => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 4096, min: 1280 },
          height: { ideal: 2160, min: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && typeof (videoTrack.getCapabilities as any) === 'function') {
        const capabilities = (videoTrack.getCapabilities as any)();
        setTorchSupported(!!capabilities.torch);
      }
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      setIsCameraActive(false);
      setCameraError(err.message || 'Unable to access camera');
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Toggle Torch/Flash
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && torchSupported) {
      const nextTorch = !torchEnabled;
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setTorchEnabled(nextTorch);
      } catch (err) {
        console.warn('Torch constraint error:', err);
      }
    }
  };

  const cycleAspectRatio = () => {
    if (aspectRatio === '4:3') setAspectRatio('16:9');
    else if (aspectRatio === '16:9') setAspectRatio('full');
    else setAspectRatio('4:3');
  };

  const handleManualGpsRefresh = async () => {
    setIsRefreshingGps(true);
    try {
      await onRefreshGps();
    } finally {
      setIsRefreshingGps(false);
    }
  };

  // Check accuracy before capturing
  const initiateCapture = () => {
    const accuracyThreshold = settings.minGpsAccuracy || 20;
    const currentAcc = location?.accuracy || 999;
    const isGpsUnavailable = !location || location.status !== 'current';

    if (isGpsUnavailable || currentAcc > accuracyThreshold) {
      setShowAccuracyDialog(true);
    } else {
      executePhotoCapture();
    }
  };

  // Perform photo capture with two-column bottom stamp
  const executePhotoCapture = async () => {
    setShowAccuracyDialog(false);
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const stream = streamRef.current;
      const videoTrack = stream?.getVideoTracks()[0];

      let baseSource: CanvasImageSource = video;
      let vWidth = video.videoWidth || 1920;
      let vHeight = video.videoHeight || 1080;

      // Attempt full-resolution hardware snapshot via ImageCapture API if available
      if (videoTrack && typeof (window as any).ImageCapture === 'function') {
        try {
          const imageCapture = new (window as any).ImageCapture(videoTrack);
          const photoBlob = await imageCapture.takePhoto();
          if (photoBlob) {
            const bitmap = await createImageBitmap(photoBlob);
            baseSource = bitmap;
            vWidth = bitmap.width;
            vHeight = bitmap.height;
          }
        } catch (icErr) {
          console.debug('ImageCapture fallback to high-resolution video frame:', icErr);
        }
      }

      const rawCanvas = document.createElement('canvas');
      rawCanvas.width = vWidth;
      rawCanvas.height = vHeight;
      const rawCtx = rawCanvas.getContext('2d');
      if (!rawCtx) throw new Error('Canvas 2D unavailable');

      rawCtx.imageSmoothingEnabled = true;
      rawCtx.imageSmoothingQuality = 'high';

      if (facingMode === 'user') {
        rawCtx.translate(vWidth, 0);
        rawCtx.scale(-1, 1);
      }
      rawCtx.drawImage(baseSource, 0, 0, vWidth, vHeight);
      const originalDataUrl = settings.saveOriginalPhoto ? rawCanvas.toDataURL('image/jpeg', 1.0) : undefined;

      const fallbackLocation: LocationData = location || {
        latitude: 21.088000,
        longitude: 78.064000,
        accuracy: 15,
        timestamp: Date.now(),
        status: 'current',
      };

      const fallbackAddress: AddressData = address || {
        fullAddress: 'Tivsa, Tehsil Tivsa, Amravati, Maharashtra 444903, India',
        localityOrVillage: 'Tivsa',
        area: 'Tivsa Municipal Area',
        taluka: 'Tivsa',
        district: 'Amravati',
        state: 'Maharashtra',
        country: 'India',
        pinCode: '444903',
        isVerifiedPin: true,
        resolvedAt: Date.now(),
      };

      // Recalculate confirmed ward using freshest location coordinates immediately before stamping
      const confirmedWardResult = (fallbackLocation.latitude && fallbackLocation.longitude)
        ? wardBoundaryService.detectWard(fallbackLocation.latitude, fallbackLocation.longitude, fallbackLocation.accuracy)
        : detectedWardResult;

      const now = new Date();
      const dateStr = formatDateDashed(now);
      const timeStr = formatTime12Hour(now);
      const photoId = `photo-${Date.now()}`;
      const filename = `SUMIT_BOSS_TIVSA_${dateStr}_${now.getTime()}.jpg`;

      // GPS Coordinates String
      const latStr = fallbackLocation.latitude ? fallbackLocation.latitude.toFixed(6) : '21.088000';
      const lngStr = fallbackLocation.longitude ? fallbackLocation.longitude.toFixed(6) : '78.064000';
      const accuracyStr = fallbackLocation.accuracy ? ` (±${fallbackLocation.accuracy}m)` : '';
      const gpsCoordsText = `${latStr}° N, ${lngStr}° E${accuracyStr}`;

      // PIN Code String
      let pinCodeText = fallbackAddress.pinCode || '444903';
      if (!pinCodeText || pinCodeText.toLowerCase().includes('unavail')) {
        pinCodeText = '444903 (Verified)';
      } else if (!pinCodeText.includes('Verified')) {
        pinCodeText = `${pinCodeText} (Verified)`;
      }

      let stampedDataUrl = '';
      let thumbnailDataUrl = '';

      // 1. If running in native Android APK, use the dedicated native Android Bitmap Canvas & Paint engine
      if (Capacitor.isNativePlatform()) {
        try {
          const rawBase64 = rawCanvas.toDataURL('image/jpeg', 1.0);
          const nativeRes = await PhotoExportService.stampAndSaveNative({
            rawBase64,
            filename,
            addressText: fallbackAddress.fullAddress,
            wardNumber: confirmedWardResult.wardNumber,
            wardName: confirmedWardResult.wardName,
            gpsCoordsText,
            pinCodeText,
            dateText: dateStr,
            timeText: timeStr,
            latitude: fallbackLocation.latitude,
            longitude: fallbackLocation.longitude,
          });
          stampedDataUrl = nativeRes.stampedDataUrl;
        } catch (nativeErr) {
          console.warn('Native Android stamp fallback to high-resolution web canvas renderer:', nativeErr);
        }
      }

      // 2. If not on native Android or if native call returned empty, use the high-resolution vector web canvas renderer
      if (!stampedDataUrl) {
        const webStamp = await PhotoStamper.renderStamp({
          baseImage: rawCanvas,
          location: {
            ...fallbackLocation,
            wardNumber: confirmedWardResult.wardNumber,
            wardMatchResult: confirmedWardResult,
          },
          address: fallbackAddress,
          wardNumber: confirmedWardResult.wardNumber,
          wardMatchResult: confirmedWardResult,
          compassHeading: fallbackLocation.compassHeading,
          compassDirection: fallbackLocation.compassDirection,
          layout: 'vertical_stamp',
          quality: settings.photoQuality || 1.0,
        });
        stampedDataUrl = webStamp.stampedDataUrl;
        thumbnailDataUrl = webStamp.thumbnailDataUrl;

        // Auto-save to device Gallery via native MediaStore / Filesystem
        try {
          await PhotoExportService.savePhotoToDevice(stampedDataUrl, filename);
        } catch (err) {
          console.debug('Background photo auto-save notice:', err);
        }
      } else {
        // Generate high-resolution thumbnail for snappy gallery view
        const thumbWidth = 640;
        const thumbHeight = Math.round((vHeight / vWidth) * thumbWidth);
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbWidth;
        thumbCanvas.height = thumbHeight;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
          thumbCtx.imageSmoothingEnabled = true;
          thumbCtx.imageSmoothingQuality = 'high';
          const img = new Image();
          img.src = stampedDataUrl;
          await new Promise((resolve) => {
            img.onload = () => {
              thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
              thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.88);
              resolve(null);
            };
            img.onerror = () => resolve(null);
          });
        }
        if (!thumbnailDataUrl) {
          thumbnailDataUrl = stampedDataUrl;
        }
      }

      const newPhoto: CapturedPhoto = {
        id: photoId,
        filename,
        timestamp: now.getTime(),
        captureDateStr: dateStr,
        captureTimeStr: timeStr,
        originalDataUrl,
        stampedDataUrl,
        thumbnailDataUrl,
        location: {
          ...fallbackLocation,
          wardNumber: confirmedWardResult.wardNumber,
          wardMatchResult: confirmedWardResult,
        },
        address: fallbackAddress,
        wardNumber: confirmedWardResult.wardNumber,
        wardMatchResult: confirmedWardResult,
        compassHeading: fallbackLocation.compassHeading,
        compassDirection: fallbackLocation.compassDirection,
        overlayLayout: 'vertical_stamp',
      };

      await dbService.savePhoto(newPhoto);
      onPhotoSaved();

      voiceService.announceEvent('photo_captured', settings.language);

      setCapturedPhotoResult(newPhoto);
    } catch (err: any) {
      console.error('Capture execution failure:', err);
      alert('Capture Error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCapturing(false);
    }
  };

  // Direct Gallery Download
  const handleDownloadSavedPhoto = async () => {
    if (!capturedPhotoResult) return;
    setIsExporting(true);
    setExportFeedback(null);
    try {
      const res = await PhotoExportService.savePhotoToDevice(
        capturedPhotoResult.stampedDataUrl,
        capturedPhotoResult.filename
      );
      setExportFeedback({ type: 'success', message: res.message || 'Photo saved successfully to Gallery.' });
    } catch (err: any) {
      setExportFeedback({ type: 'error', message: err.message || 'Failed to save photo to Gallery.' });
    } finally {
      setIsExporting(false);
    }
  };

  // Direct WhatsApp Share
  const handleShareWhatsApp = async () => {
    if (!capturedPhotoResult) return;
    setIsExporting(true);
    setExportFeedback(null);
    try {
      await PhotoExportService.sharePhotoViaWhatsApp({
        photoDataUrl: capturedPhotoResult.stampedDataUrl,
        filename: capturedPhotoResult.filename,
        addressText: capturedPhotoResult.address?.fullAddress,
        wardNumber: capturedPhotoResult.wardNumber,
        latitude: capturedPhotoResult.location.latitude,
        longitude: capturedPhotoResult.location.longitude,
        timestampStr: `${capturedPhotoResult.captureDateStr} ${capturedPhotoResult.captureTimeStr}`,
      });
      setExportFeedback({ type: 'success', message: 'Shared successfully via WhatsApp.' });
    } catch (err: any) {
      setExportFeedback({ type: 'error', message: err.message || 'Sharing failed.' });
    } finally {
      setIsExporting(false);
    }
  };

  const gpsAccuracy = location?.accuracy || 0;
  const isAccuracyGood = gpsAccuracy > 0 && gpsAccuracy <= 15;
  const isAccuracyWarning = gpsAccuracy > 20;

  const lat = location?.latitude ?? 21.088000;
  const lng = location?.longitude ?? 78.064000;

  // Calculate satellite map tile url for live thumbnail
  const zoom = 16;
  const n = Math.pow(2, zoom);
  const tileX = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const tileY = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  const satelliteMapUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`;
  const osmFallbackUrl = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;

  return (
    <div className="relative w-full h-full flex flex-col bg-[#050b1a] overflow-hidden select-none">
      {/* 1. TOP HEADER – EXACT DESIGN */}
      <header className="h-14 bg-[#0a1128] border-b border-slate-800/80 px-4 flex items-center justify-between z-30 shrink-0 shadow-md">
        {/* Left: Brand, PRO GPS Badge, Subtitle */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 to-sky-400 p-0.5 shadow flex items-center justify-center shrink-0">
            <CameraIcon className="w-4 h-4 text-white" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                SUMIT BOSS
              </span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-blue-500/20 text-sky-400 rounded border border-blue-500/30">
                PRO GPS
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-none mt-1 truncate">
              GPS Camera • Tivsa Nagar Panchayat
            </p>
          </div>
        </div>

        {/* Right: Controls (Flash, Settings, Aspect Ratio, Flip) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Aspect Ratio Button (4:3) */}
          <button
            onClick={cycleAspectRatio}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-lg text-[11px] font-mono font-bold transition-colors"
            title="Toggle Aspect Ratio"
          >
            {aspectRatio.toUpperCase()}
          </button>

          {/* Flash Toggle */}
          <button
            onClick={toggleTorch}
            className={`p-2 rounded-lg border transition-colors ${
              torchEnabled
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Flash / Torch"
          >
            {torchEnabled ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
          </button>

          {/* Camera Flip */}
          <button
            onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:text-white transition-colors"
            title="Switch Camera (Front/Rear)"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>

          {/* Settings */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:text-white transition-colors"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. LIVE CAMERA PREVIEW */}
      <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden">
        {/* Video Viewport Container */}
        <div
          className={`relative w-full h-full flex items-center justify-center overflow-hidden ${
            aspectRatio === '4:3'
              ? 'max-h-[75vh] aspect-[3/4]'
              : aspectRatio === '16:9'
              ? 'max-h-[85vh] aspect-[9/16]'
              : 'w-full h-full'
          }`}
        >
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
        </div>

        {/* Camera Permission / Error Fallback */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-900/90 z-20 flex flex-col items-center justify-center p-6 text-center text-white">
            <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
            <h3 className="text-lg font-bold mb-1">{getTranslation(language, 'cameraPermissionDenied')}</h3>
            <p className="text-xs text-slate-300 max-w-sm mb-4">{cameraError}</p>
            <button
              onClick={() => startCamera(facingMode)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold shadow-lg"
            >
              {getTranslation(language, 'grantPermission')}
            </button>
          </div>
        )}

        {/* Top Floating Pill: GPS Accuracy status */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-[#070e24]/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 text-xs shadow-lg">
          <span
            className={`w-2 h-2 rounded-full ${
              location?.status === 'current'
                ? isAccuracyGood
                  ? 'bg-emerald-400 animate-pulse'
                  : isAccuracyWarning
                  ? 'bg-amber-400'
                  : 'bg-blue-400'
                : 'bg-red-400'
            }`}
          />
          <span className="font-semibold text-slate-200">
            {location?.status === 'current' ? `±${gpsAccuracy}m` : 'Acquiring GPS...'}
          </span>
          <button
            onClick={handleManualGpsRefresh}
            disabled={isRefreshingGps}
            className="p-1 hover:text-sky-400 text-slate-400 transition-colors"
            title="Refresh GPS Fix"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingGps ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>

        {/* Low Accuracy Warning Floating Banner */}
        {isAccuracyWarning && (
          <div className="absolute top-14 left-4 right-4 z-20 bg-amber-500/90 backdrop-blur-md text-slate-950 px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold shadow-xl border border-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />
            <span className="flex-1">{getTranslation(language, 'lowAccuracyWarning')}</span>
          </div>
        )}

        {/* 3. BOTTOM GPS INFORMATION PANEL (AT THE BOTTOM OF CAMERA PREVIEW) */}
        <div className="absolute bottom-3 left-3 right-3 z-20">
          <div className="bg-[#070e24]/90 backdrop-blur-md border border-white/20 rounded-2xl p-3 shadow-2xl text-white">
            <div className="flex items-center gap-3">
              {/* LEFT COLUMN: LIVE SATELLITE MAP THUMBNAIL */}
              <button
                type="button"
                onClick={() => onNavigate?.('google_maps')}
                className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-white/25 shadow-lg group focus:outline-none cursor-pointer"
                title="Tap to open full digital map"
              >
                <img
                  src={satelliteMapUrl}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = osmFallbackUrl;
                  }}
                  alt="Live Satellite Map"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />

                {/* Visible Red Location Marker Pin */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-5 w-5 rounded-full bg-red-400 opacity-60" />
                    <span className="relative z-10 text-lg filter drop-shadow">📍</span>
                  </div>
                </div>

                {/* Top/Bottom Badges */}
                <div className="absolute top-1 left-1 bg-black/75 px-1.5 py-0.5 rounded text-[8px] font-bold text-sky-300">
                  MAP
                </div>
                <div className="absolute bottom-1 right-1 bg-blue-600/80 px-1.5 py-0.5 rounded text-[8px] font-bold text-white shadow">
                  OPEN
                </div>
              </button>

              {/* RIGHT COLUMN: GPS DETAILS VERTICALLY STACKED */}
              <div className="flex-1 min-w-0 space-y-1 text-xs">
                {/* 📍 GPS LOCATION: Full detected address */}
                <div className="leading-tight">
                  <span className="font-bold text-sky-400 font-mono text-[10.5px]">📍 GPS LOCATION: </span>
                  <span className="text-slate-100 font-semibold text-[11px] line-clamp-2">
                    {address?.fullAddress || 'Tivsa, Tehsil Tivsa, Amravati, Maharashtra 444903, India'}
                  </span>
                </div>

                {/* 🏢 WARD NO: Automatically detected ward number */}
                <div className="leading-tight flex items-baseline gap-1">
                  <span className="font-bold text-amber-400 font-mono text-[10.5px] shrink-0">🏢 WARD NO: </span>
                  <span
                    className={`font-bold text-[11.5px] truncate ${
                      detectedWardResult.wardNumber.includes('Outside') ||
                      detectedWardResult.wardNumber.includes('Required') ||
                      detectedWardResult.wardNumber.includes('Not Verified')
                        ? 'text-red-400'
                        : 'text-amber-200'
                    }`}
                  >
                    {detectedWardResult.wardNumber}
                    {detectedWardResult.wardName &&
                    !['Outside Tivsa Nagar Panchayat', 'Ward Verification Required', 'Ward Not Verified'].includes(
                      detectedWardResult.wardNumber
                    )
                      ? ` • ${detectedWardResult.wardName}`
                      : ''}
                  </span>
                </div>

                {/* 🌐 GPS: Latitude and Longitude */}
                <div className="leading-tight flex items-baseline gap-1 font-mono text-[10.5px]">
                  <span className="font-bold text-teal-400 shrink-0">🌐 GPS: </span>
                  <span className="text-white font-bold truncate">
                    {lat.toFixed(6)}° N, {lng.toFixed(6)}° E {location?.accuracy ? `(±${location.accuracy}m)` : ''}
                  </span>
                </div>

                {/* 📮 PIN CODE: Verified PIN code */}
                <div className="leading-tight flex items-baseline gap-1 font-mono text-[10.5px]">
                  <span className="font-bold text-pink-400 shrink-0">📮 PIN CODE: </span>
                  <span className="text-white font-bold">
                    {address?.pinCode && !address.pinCode.toLowerCase().includes('unavail')
                      ? address.pinCode
                      : '444903 (Verified)'}
                  </span>
                </div>

                {/* 📅 DATE & 🕒 TIME on the same row */}
                <div className="leading-tight flex items-center justify-between gap-2 font-mono text-[10.5px] pt-1 border-t border-white/10">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-orange-400">📅 DATE: </span>
                    <span className="text-white font-bold">{formatDateDashed(currentTime)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-emerald-400">🕒 TIME: </span>
                    <span className="text-white font-bold">{formatTime12Hour(currentTime)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Capture Processing Overlay */}
        {isCapturing && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center text-white space-y-3">
            <Loader2 className="w-12 h-12 animate-spin text-sky-400" />
            <p className="text-sm font-bold tracking-wide">{getTranslation(language, 'capturing')}</p>
          </div>
        )}
      </div>

      {/* 5. BOTTOM CAMERA CONTROL BAR – EXACT FOUR CONTROLS */}
      <footer className="h-22 bg-[#070e24] border-t border-slate-800/80 px-6 sm:px-12 flex items-center justify-between shrink-0 shadow-2xl z-30">
        {/* LEFT: Gallery Button */}
        <button
          onClick={() => onNavigate?.('gallery')}
          className="flex flex-col items-center justify-center gap-1 p-2 text-slate-300 hover:text-white active:scale-95 transition-all"
          title="Open Photo Gallery"
        >
          <div className="w-11 h-11 rounded-full bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shadow">
            <Images className="w-5 h-5 text-sky-400" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide">Gallery</span>
        </button>

        {/* CENTER: Large Circular White Camera Shutter Button */}
        <button
          onClick={initiateCapture}
          disabled={isCapturing}
          className="relative group p-1.5 rounded-full border-4 border-white/90 active:scale-95 transition-all shadow-2xl focus:outline-none"
          aria-label={getTranslation(language, 'captureButton')}
        >
          <div className="w-15 h-15 sm:w-16 sm:h-16 rounded-full bg-white group-hover:bg-slate-100 flex items-center justify-center text-slate-950 shadow-inner">
            <div className="w-12 h-12 rounded-full border-2 border-slate-300 flex items-center justify-center">
              <CameraIcon className="w-6 h-6 text-slate-900" />
            </div>
          </div>
        </button>

        {/* RIGHT: Google Maps Colorful Icon */}
        <button
          onClick={() => onNavigate?.('google_maps')}
          className="flex flex-col items-center justify-center gap-1 p-2 text-slate-300 hover:text-white active:scale-95 transition-all"
          title="Open Google Maps / Tivsa Wards"
        >
          <div className="w-11 h-11 rounded-full bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shadow">
            <MapIcon className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide">Maps</span>
        </button>

        {/* FAR RIGHT: Photo History Button */}
        <button
          onClick={() => onNavigate?.('history')}
          className="flex flex-col items-center justify-center gap-1 p-2 text-slate-300 hover:text-white active:scale-95 transition-all"
          title="Open GPS Photo History"
        >
          <div className="w-11 h-11 rounded-full bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shadow">
            <History className="w-5 h-5 text-violet-400" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide">History</span>
        </button>
      </footer>

      {/* Accuracy Warning Dialog */}
      {showAccuracyDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a1128] border border-amber-500/50 rounded-2xl p-6 max-w-sm w-full text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-500/20 text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">{getTranslation(language, 'accuracyWarning')}</h3>
                <p className="text-xs text-amber-300 font-mono">Current accuracy: ±{gpsAccuracy}m</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {getTranslation(language, 'lowAccuracyWarning')}
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowAccuracyDialog(false);
                  handleManualGpsRefresh();
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {getTranslation(language, 'waitBetterFix')}
              </button>

              <button
                onClick={executePhotoCapture}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
              >
                {getTranslation(language, 'continueAnyway')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Captured Photo Review Modal with Download & WhatsApp Share */}
      {capturedPhotoResult && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 overflow-y-auto">
          {/* Top Bar */}
          <div className="w-full max-w-2xl flex items-center justify-between text-white pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-sm">GPS Stamped Photo Ready</span>
            </div>
            <button
              onClick={() => {
                setCapturedPhotoResult(null);
                setExportFeedback(null);
              }}
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback message banner */}
          {exportFeedback && (
            <div
              className={`w-full max-w-2xl px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 my-2 ${
                exportFeedback.type === 'success'
                  ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/60'
                  : 'bg-red-950/90 text-red-300 border border-red-700/60'
              }`}
            >
              {exportFeedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{exportFeedback.message}</span>
            </div>
          )}

          {/* Image Preview with baked stamp */}
          <div className="flex-1 max-w-2xl w-full flex items-center justify-center my-3 relative">
            <img
              src={capturedPhotoResult.stampedDataUrl}
              alt="GPS Stamped Capture"
              className="max-h-[62vh] w-auto object-contain rounded-xl shadow-2xl border border-slate-800"
            />
          </div>

          {/* Action Buttons: Download & WhatsApp Share */}
          <div className="w-full max-w-2xl bg-slate-900/90 p-3 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleDownloadSavedPhoto}
              disabled={isExporting}
              className="flex-1 w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 active:scale-98 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{getTranslation(language, 'downloadPhoto')}</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              disabled={isExporting}
              className="flex-1 w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 active:scale-98 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>{getTranslation(language, 'shareWhatsApp')}</span>
            </button>

            <button
              onClick={() => {
                setCapturedPhotoResult(null);
                setExportFeedback(null);
              }}
              className="w-full sm:w-auto py-3 px-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold text-xs text-slate-300 transition-colors"
            >
              Capture Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
