export type Language = 'en' | 'mr' | 'hi';

export type OverlayLayout = 
  | 'vertical_stamp'       // Standard Single Vertical Block (bottom-left)
  | 'vertical_stamp_right' // Single Vertical Block (bottom-right)
  | 'classic_bottom';      // Full width bottom band

export type GpsStatusType = 
  | 'GPS FIX ACQUIRED'
  | 'WAITING FOR GPS'
  | 'LOW GPS ACCURACY'
  | 'LOCATION PERMISSION REQUIRED'
  | 'LOCATION UNAVAILABLE';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number; // horizontal accuracy in meters
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number; // location fix timestamp
  status: 'acquiring' | 'current' | 'stale' | 'unavailable' | 'denied';
  gpsStatusText?: GpsStatusType;
  compassHeading?: number | null; // 0-360 degrees
  compassDirection?: string | null; // e.g. 'NE', 'NW', '324° NW'
  wardNumber?: string;
  wardMatchResult?: WardMatchResult;
  errorMessage?: string;
}

export interface AddressData {
  fullAddress: string;
  buildingOrHouse?: string;
  road?: string;
  localityOrVillage?: string;
  area?: string;
  taluka?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  country?: string;
  isVerifiedPin: boolean;
  isManualEdit?: boolean;
  resolvedAt: number;
}

export interface WardBoundaryFeature {
  id: string;
  wardNumber: string; // e.g. "Ward No. 1" to "Ward No. 17"
  wardName?: string;   // e.g. "Chhatrapati Shivaji Maharaj Ward"
  municipality?: string;
  color?: string;
  // GeoJSON Polygon coordinates: array of linear rings [[lng, lat], ...]
  coordinates: number[][][];
}

export interface WardBoundaryDataset {
  municipalityName: string;
  source: string;
  updatedAt: number;
  wards: WardBoundaryFeature[];
}

export type WardVerificationStatus =
  | 'VERIFIED'
  | 'UNVERIFIED'
  | 'GPS UNCERTAIN'
  | 'OUTSIDE MUNICIPALITY';

export interface WardMatchResult {
  wardNumber: string; // "Ward No. X" or "Ward Not Verified"
  wardName?: string;
  status: 'matched' | 'not_verified' | 'boundary_warning' | 'overlapping';
  verificationStatus: WardVerificationStatus;
  distanceToEdgeMeters?: number;
  overlappingWards?: string[];
  isManual?: boolean;
  confidence: 'high' | 'boundary_uncertain' | 'none';
  datasetSource?: string;
  datasetVersion?: string;
}

export interface CapturedPhoto {
  id: string;
  filename: string;
  timestamp: number; // capture timestamp
  captureDateStr: string;
  captureTimeStr: string;
  originalDataUrl?: string; // Optional original unmodified capture
  stampedDataUrl: string;   // High-res stamped photo with overlay baked in
  thumbnailDataUrl?: string;
  location: LocationData;
  address: AddressData;
  wardNumber?: string;
  wardMatchResult?: WardMatchResult;
  compassHeading?: number | null;
  compassDirection?: string | null;
  area?: string;
  notes?: string;
  overlayLayout: OverlayLayout;
  fileSize?: number;
}

export interface AppSettings {
  language: Language;
  overlayLayout: OverlayLayout;
  minGpsAccuracy: number; // Warning threshold in meters (default 20)
  autoRefreshGps: boolean;
  saveOriginalPhoto: boolean;
  saveStampedPhoto: boolean;
  photoQuality: number; // 0.7 - 1.0
  voiceAnnouncements: boolean;
  speechVolume: number;
  dateFormat: 'DD-MM-YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  showMiniMapInStamp: boolean;
  googleMapsApiKey?: string;
  useGoogleMapsStatic: boolean;
}
