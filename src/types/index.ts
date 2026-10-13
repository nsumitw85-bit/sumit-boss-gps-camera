export type Language = 'en' | 'mr' | 'hi';

export type OverlayLayout = 
  | 'classic_bottom' 
  | 'modern_card' 
  | 'sidebar_compact' 
  | 'full_inspector';

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
  wardNumber: string;
  wardName?: string;
  municipality?: string;
  // GeoJSON Polygon coordinates: array of linear rings [[lng, lat], ...]
  coordinates: number[][][];
}

export interface WardBoundaryDataset {
  municipalityName: string;
  source: string;
  updatedAt: number;
  wards: WardBoundaryFeature[];
}

export interface WardMatchResult {
  wardNumber: string;
  wardName?: string;
  status: 'matched' | 'not_identified' | 'boundary_warning' | 'overlapping';
  distanceToEdgeMeters?: number;
  overlappingWards?: string[];
  isManual?: boolean;
  confidence: 'high' | 'boundary_uncertain' | 'none' | 'manual';
}

export interface Worker {
  id: string;
  name: string;
  mobile?: string;
  designation?: string;
  workCategoryId?: string;
  wardNumber?: string;
  area?: string;
  joiningDate?: string;
  notes?: string;
  createdAt: number;
}

export interface WorkCategory {
  id: string;
  name: string;
  nameMr: string;
  nameHi: string;
  description?: string;
  isDefault?: boolean;
  createdAt: number;
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
  workerId?: string;
  workerName?: string;
  workCategoryId?: string;
  workCategoryName?: string;
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
  minGpsAccuracy: number; // Warning threshold in meters (e.g. 20)
  autoRefreshGps: boolean;
  saveOriginalPhoto: boolean;
  saveStampedPhoto: boolean;
  photoQuality: number; // 0.7 - 1.0
  defaultWorkerId?: string;
  defaultCategoryId?: string;
  defaultWard?: string;
  voiceAnnouncements: boolean;
  speechVolume: number;
  dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD';
  showMiniMapInStamp: boolean;
  googleMapsApiKey?: string;
  useGoogleMapsStatic: boolean;
}
