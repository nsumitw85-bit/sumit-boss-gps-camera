import { LocationData, AddressData, GpsStatusType, WardMatchResult } from '../types';
import { dbService } from './db';
import { wardBoundaryService } from './wardBoundaryService';

export class GpsService {
  private watchId: number | null = null;
  private latestLocation: LocationData | null = null;
  private listeners: Array<(loc: LocationData) => void> = [];
  private currentHeading: number | null = null;
  private currentHeadingStr: string | null = null;
  private orientationListenerActive = false;
  private subscribersCount = 0;

  constructor() {
    this.initCompassListener();
  }

  private initCompassListener() {
    if (typeof window === 'undefined') return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      let heading: number | null = null;

      // iOS Safari provides webkitCompassHeading directly (0 = North)
      if ((event as any).webkitCompassHeading !== undefined) {
        heading = Math.round((event as any).webkitCompassHeading);
      } else if (event.alpha !== null && !isNaN(event.alpha)) {
        // Standard Android / Chrome
        heading = Math.round(360 - event.alpha);
        if (heading < 0) heading += 360;
        if (heading >= 360) heading -= 360;
      }

      if (heading !== null && !isNaN(heading)) {
        this.currentHeading = heading;
        this.currentHeadingStr = `${heading}° ${this.degToCompass(heading)}`;
        if (this.latestLocation) {
          this.latestLocation.compassHeading = this.currentHeading;
          this.latestLocation.compassDirection = this.currentHeadingStr;
        }
      }
    };

    try {
      const win = window as any;
      if (typeof win.ondeviceorientationabsolute !== 'undefined') {
        win.addEventListener('deviceorientationabsolute', handleOrientation, true);
        this.orientationListenerActive = true;
      } else if (typeof win.ondeviceorientation !== 'undefined') {
        win.addEventListener('deviceorientation', handleOrientation, true);
        this.orientationListenerActive = true;
      }
    } catch {
      // Sensor not permitted or unavailable
    }
  }

  private degToCompass(num: number): string {
    const val = Math.floor(num / 22.5 + 0.5);
    const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return arr[val % 16] || 'N';
  }

  subscribe(listener: (loc: LocationData) => void): () => void {
    this.listeners.push(listener);
    this.subscribersCount++;
    if (this.latestLocation) {
      listener(this.latestLocation);
    }
    // Auto start watching when first subscriber joins
    if (this.subscribersCount === 1) {
      this.startWatching();
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
      this.subscribersCount = Math.max(0, this.subscribersCount - 1);
      if (this.subscribersCount === 0) {
        this.stopWatching(); // Save battery when no active listeners
      }
    };
  }

  private calculateGpsStatus(status: LocationData['status'], accuracy: number, timestamp: number): GpsStatusType {
    if (status === 'denied') return 'LOCATION PERMISSION REQUIRED';
    if (status === 'unavailable') return 'LOCATION UNAVAILABLE';
    if (status === 'acquiring') return 'WAITING FOR GPS';

    const isStale = Date.now() - timestamp > 30000;
    if (isStale) return 'WAITING FOR GPS';

    if (accuracy > 20) return 'LOW GPS ACCURACY';
    return 'GPS FIX ACQUIRED';
  }

  private notify(loc: LocationData) {
    loc.compassHeading = this.currentHeading;
    loc.compassDirection = this.currentHeadingStr || 'Direction unavailable';
    loc.gpsStatusText = this.calculateGpsStatus(loc.status, loc.accuracy, loc.timestamp);

    // Dynamic point-in-polygon ward determination based on verified coordinates
    if (loc.latitude && loc.longitude) {
      const wardMatch = this.detectWard(loc.latitude, loc.longitude);
      loc.wardNumber = wardMatch.wardNumber;
      loc.wardMatchResult = wardMatch;
    } else {
      loc.wardNumber = 'Ward Not Identified';
      loc.wardMatchResult = {
        wardNumber: 'Ward Not Identified',
        status: 'not_identified',
        confidence: 'none',
      };
    }

    this.latestLocation = loc;
    this.listeners.forEach((l) => l(loc));
  }

  getCurrentFix(): LocationData | null {
    return this.latestLocation;
  }

  startWatching(): void {
    if (this.watchId !== null) return;

    if (!('geolocation' in navigator)) {
      this.notify({
        latitude: 0,
        longitude: 0,
        accuracy: 9999,
        timestamp: Date.now(),
        status: 'unavailable',
        errorMessage: 'Geolocation is not supported on this device/browser',
      });
      return;
    }

    this.notify({
      latitude: this.latestLocation?.latitude || 0,
      longitude: this.latestLocation?.longitude || 0,
      accuracy: this.latestLocation?.accuracy || 999,
      timestamp: Date.now(),
      status: 'acquiring',
    });

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 4000,
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const loc: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          altitude: position.coords.altitude ? Math.round(position.coords.altitude) : null,
          heading: position.coords.heading ? Math.round(position.coords.heading) : null,
          speed: position.coords.speed ? Math.round(position.coords.speed * 3.6) : null, // km/h
          timestamp: position.timestamp || Date.now(),
          status: 'current',
        };
        this.notify(loc);
      },
      (error) => {
        const status = error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable';
        const msg =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission denied by user'
            : error.code === error.POSITION_UNAVAILABLE
            ? 'GPS position unavailable. Ensure GPS is enabled.'
            : 'GPS acquisition timed out.';

        this.notify({
          latitude: this.latestLocation?.latitude || 0,
          longitude: this.latestLocation?.longitude || 0,
          accuracy: this.latestLocation?.accuracy || 9999,
          timestamp: Date.now(),
          status,
          errorMessage: msg,
        });
      },
      options
    );
  }

  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  async requestSingleFreshFix(): Promise<LocationData> {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        const loc: LocationData = {
          latitude: 0,
          longitude: 0,
          accuracy: 9999,
          timestamp: Date.now(),
          status: 'unavailable',
          errorMessage: 'Geolocation not supported',
        };
        this.notify(loc);
        resolve(loc);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
            altitude: position.coords.altitude ? Math.round(position.coords.altitude) : null,
            heading: position.coords.heading ? Math.round(position.coords.heading) : null,
            speed: position.coords.speed ? Math.round(position.coords.speed * 3.6) : null,
            timestamp: position.timestamp || Date.now(),
            status: 'current',
          };
          this.notify(loc);
          resolve(loc);
        },
        (error) => {
          const status = error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable';
          const loc: LocationData = {
            latitude: this.latestLocation?.latitude || 0,
            longitude: this.latestLocation?.longitude || 0,
            accuracy: this.latestLocation?.accuracy || 9999,
            timestamp: Date.now(),
            status,
            errorMessage: error.message,
          };
          this.notify(loc);
          resolve(loc);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }

  /**
   * Helper to extract a valid 6-digit Indian postal PIN code (100000 - 999999)
   */
  private extractIndianPinCode(text?: string | number | null): string | null {
    if (!text) return null;
    const str = String(text).trim();
    // Check direct 6-digit PIN code (standard Indian postal PIN starts with 1-9)
    const exactMatch = str.match(/^[1-9][0-9]{5}$/);
    if (exactMatch) return exactMatch[0];

    // Check embedded 6-digit PIN code in address string
    const embeddedMatch = str.match(/\b([1-9][0-9]{5})\b/);
    if (embeddedMatch) return embeddedMatch[1];

    return null;
  }

  /**
   * Reverse Geocoding with complete address fields & accurate postal PIN code detection.
   * Uses high-precision street-level reverse geocoding with automatic fallback to area-level
   * when street-level nodes lack postal code metadata (common in Indian towns/villages).
   */
  async reverseGeocode(lat: number, lng: number, forceRefresh = false): Promise<AddressData> {
    if (!forceRefresh) {
      const cached = await dbService.getCachedAddress(lat, lng);
      // Return cached address only if it has a verified PIN or was resolved recently
      if (cached && cached.isVerifiedPin) return cached;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      // Primary Query: High-detail zoom 18
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'en,mr,hi',
          'User-Agent': 'SumitBoss-GPSMapCamera/2.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Geocoding HTTP error ${response.status}`);
      }

      const data = await response.json();
      const addr = data.address || {};

      // A. Building / House / Road
      const buildingOrHouse = addr.house_number || addr.building || addr.house_name || '';
      const road = addr.road || addr.street || addr.pedestrian || addr.footway || '';

      // B. Village / Town / Locality
      const localityOrVillage =
        addr.village ||
        addr.town ||
        addr.city ||
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.city_district ||
        '';

      const area = addr.suburb || addr.neighbourhood || addr.quarter || addr.commercial || localityOrVillage;

      // C. Taluka / Tehsil / Subdistrict
      const taluka = addr.county || addr.subdistrict || addr.tehsil || '';

      // D. District
      const district = addr.state_district || addr.district || addr.city || '';

      // E. State
      const state = addr.state || 'Maharashtra';

      // G. Country
      const country = addr.country || 'India';

      // F. Postal PIN Code detection:
      // Step 1: Check postcode directly from zoom 18 address
      let verifiedPin = this.extractIndianPinCode(addr.postcode) || this.extractIndianPinCode(data.display_name);

      // Step 2: If street-level node does not contain a postcode, query the containing postal/locality area
      if (!verifiedPin) {
        try {
          const areaController = new AbortController();
          const areaTimeoutId = setTimeout(() => areaController.abort(), 4000);
          const areaUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
          const areaResponse = await fetch(areaUrl, {
            headers: {
              'Accept-Language': 'en,mr,hi',
              'User-Agent': 'SumitBoss-GPSMapCamera/2.0',
            },
            signal: areaController.signal,
          });
          clearTimeout(areaTimeoutId);
          if (areaResponse.ok) {
            const areaData = await areaResponse.json();
            verifiedPin = this.extractIndianPinCode(areaData.address?.postcode) || this.extractIndianPinCode(areaData.display_name);
          }
        } catch {
          // Secondary area lookup failure is non-fatal
        }
      }

      const isVerifiedPin = !!verifiedPin;
      const pinCode = verifiedPin || 'Unavailable';

      // Build formatted multi-line address:
      const streetPart = [buildingOrHouse, road].filter(Boolean).join(', ');
      const townPart = [area, localityOrVillage && localityOrVillage !== area ? localityOrVillage : ''].filter(Boolean).join(', ');
      const adminPart = [taluka && taluka !== district ? `Taluka: ${taluka}` : '', district, `${state} ${isVerifiedPin ? pinCode : ''}`].filter(Boolean).join(', ');

      const formattedLines = [
        streetPart || townPart || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        streetPart ? townPart : '',
        adminPart,
        country
      ].filter(Boolean);

      const fullAddress = formattedLines.join(', ');

      const result: AddressData = {
        fullAddress,
        buildingOrHouse,
        road,
        localityOrVillage,
        area,
        taluka,
        district,
        state,
        pinCode,
        country,
        isVerifiedPin,
        resolvedAt: Date.now(),
      };

      await dbService.setCachedAddress(lat, lng, result);
      return result;
    } catch (err: any) {
      // Graceful offline fallback: Never crash the application, indicate unavailable
      const offlineAddress: AddressData = {
        fullAddress: `Lat: ${lat.toFixed(6)}, Long: ${lng.toFixed(6)} (Offline - Address unverified)`,
        localityOrVillage: '',
        area: '',
        taluka: '',
        district: '',
        state: 'Maharashtra',
        pinCode: 'Unavailable',
        country: 'India',
        isVerifiedPin: false,
        resolvedAt: Date.now(),
      };
      return offlineAddress;
    }
  }

  /**
   * Ray-Casting Point-in-Polygon algorithm in the GPS service.
   * Point: [lng, lat]
   * Ring: [[lng, lat], ...]
   */
  public pointInPolygon(point: [number, number], ring: number[][]): boolean {
    const x = point[0]; // lng
    const y = point[1]; // lat
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * Accurately determines the municipal ward based on coordinates using
   * point-in-polygon testing against verified municipal ward boundaries.
   * If boundary data is missing or coordinates are outside boundaries,
   * returns 'Ward Not Identified' instead of a hardcoded ward.
   */
  public detectWard(latitude: number, longitude: number): WardMatchResult {
    return wardBoundaryService.detectWard(latitude, longitude);
  }

  /**
   * Imports and loads municipal ward boundaries from an uploaded GeoJSON string.
   */
  public loadWardBoundariesFromGeoJson(
    geoJsonString: string,
    municipalityName?: string
  ): { success: boolean; message: string; count?: number } {
    return wardBoundaryService.importGeoJson(geoJsonString, municipalityName);
  }
}

export const gpsService = new GpsService();
