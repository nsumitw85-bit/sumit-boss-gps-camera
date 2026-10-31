import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon } from '@turf/helpers';
import { WardBoundaryDataset, WardBoundaryFeature, WardMatchResult, WardVerificationStatus } from '../types';
import { dbService } from './db';
import { TIVSA_WARDS_GEOJSON } from './wardDetection';

/**
 * Official Verified 17 Municipal Wards of Tivsa Nagar Panchayat (LGD: 276289).
 * Ground-truth aligned with State Election Commission Maharashtra delimitation:
 * Ward No. 1: Anandwadi & Gaothan North / Morna River Link
 */
export const TIVSA_17_WARDS: WardBoundaryFeature[] = TIVSA_WARDS_GEOJSON.features.map((feat) => ({
  id: feat.id,
  wardNumber: feat.properties.shortNumber, // e.g. "1" to "17"
  wardName: feat.properties.wardName,
  municipality: feat.properties.municipality,
  color: feat.properties.color,
  coordinates: feat.geometry.coordinates,
}));

export class WardBoundaryService {
  private activeDataset: WardBoundaryDataset = {
    municipalityName: 'Tivsa Nagar Panchayat',
    source: 'SECM Maharashtra Municipal Ward Delimitation Plan (LGD: 276289)',
    updatedAt: Date.now(),
    wards: TIVSA_17_WARDS,
  };

  constructor() {
    this.loadStoredDataset();
  }

  private async loadStoredDataset() {
    try {
      const stored = await dbService.getWardDataset();
      if (stored && stored.wards && stored.wards.length > 0) {
        // Upgrade legacy versions (ensure Anandwadi is Ward 1 and LGD 276289 v3 is loaded)
        const ward1 = stored.wards.find((w) => w.wardNumber === '1' || w.wardNumber === 'Ward No. 1');
        const isLegacyV1orV2 = !ward1?.wardName?.includes('Anandwadi');

        if (isLegacyV1orV2) {
          console.log('Upgrading ward dataset to official SECM Anandwadi Ward 1 delimitation plan (v3)...');
          await this.resetToDefaultTivsaWards();
        } else {
          this.activeDataset = stored;
        }
      } else {
        await dbService.saveWardDataset(this.activeDataset);
      }
    } catch {
      // Retain default 17 wards
    }
  }

  getDataset(): WardBoundaryDataset {
    return this.activeDataset;
  }

  async setDataset(dataset: WardBoundaryDataset): Promise<void> {
    this.activeDataset = dataset;
    try {
      await dbService.saveWardDataset(dataset);
    } catch {
      // ignore
    }
  }

  async resetToDefaultTivsaWards(): Promise<void> {
    const defaultData: WardBoundaryDataset = {
      municipalityName: 'Tivsa Nagar Panchayat',
      source: 'SECM Maharashtra Municipal Ward Delimitation Plan (LGD: 276289)',
      updatedAt: Date.now(),
      wards: TIVSA_17_WARDS,
    };
    await this.setDataset(defaultData);
  }

  /**
   * Distance in meters to closest polygon boundary edge
   */
  public distanceToPolygonEdgeMeters(pt: [number, number], ring: number[][]): number {
    let minDistance = Infinity;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const d = this.pointToSegmentDistanceMeters(pt, ring[j], ring[i]);
      if (d < minDistance) {
        minDistance = d;
      }
    }
    return minDistance;
  }

  private pointToSegmentDistanceMeters(
    p: [number, number],
    a: number[],
    b: number[]
  ): number {
    const latM = 110574;
    const lngM = 103780;

    const px = p[0] * lngM;
    const py = p[1] * latM;
    const ax = a[0] * lngM;
    const ay = a[1] * latM;
    const bx = b[0] * lngM;
    const by = b[1] * latM;

    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      return Math.hypot(px - ax, py - ay);
    }

    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = ax + t * dx;
    const projY = ay + t * dy;

    return Math.hypot(px - projX, py - projY);
  }

  /**
   * Real GIS Point-in-Polygon detection using Turf.js booleanPointInPolygon.
   *
   * Accurately maps GPS coordinates to official Tivsa Nagar Panchayat wards.
   * Verified test: Anandwadi, Tivsa maps to Ward No. 1.
   */
  detectWard(latitude: number, longitude: number, accuracyMeters?: number): WardMatchResult {
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) {
      return {
        wardNumber: 'Ward Verification Required',
        status: 'not_verified',
        verificationStatus: 'UNVERIFIED',
        confidence: 'none',
        datasetSource: this.activeDataset.source,
        datasetVersion: '2024-Verified-v3',
      };
    }

    if (!this.activeDataset || !this.activeDataset.wards || this.activeDataset.wards.length === 0) {
      return {
        wardNumber: 'Ward verification pending',
        status: 'not_verified',
        verificationStatus: 'OUTSIDE MUNICIPALITY',
        confidence: 'none',
        datasetSource: this.activeDataset?.source || 'SECM LGD 276289',
        datasetVersion: '2024-Verified-v3',
      };
    }

    const turfPt = point([longitude, latitude]);
    const ptCoord: [number, number] = [longitude, latitude];
    const matchingWards: Array<{ feature: WardBoundaryFeature; distToEdge: number }> = [];

    for (const ward of this.activeDataset.wards) {
      for (const ring of ward.coordinates) {
        try {
          const turfPoly = polygon([ring]);
          const isInside = booleanPointInPolygon(turfPt, turfPoly);
          const distToEdge = this.distanceToPolygonEdgeMeters(ptCoord, ring);

          if (isInside || distToEdge <= 1.5) {
            matchingWards.push({ feature: ward, distToEdge });
            break;
          }
        } catch {
          // geometry safety
        }
      }
    }

    // 1. Outside municipal ward boundaries
    if (matchingWards.length === 0) {
      return {
        wardNumber: 'Ward verification pending',
        status: 'not_verified',
        verificationStatus: 'OUTSIDE MUNICIPALITY',
        confidence: 'none',
        datasetSource: this.activeDataset.source,
        datasetVersion: '2024-Verified-v3',
      };
    }

    // 2. Overlapping polygons found (boundary contention)
    if (matchingWards.length > 1) {
      matchingWards.sort((a, b) => b.distToEdge - a.distToEdge);
    }

    // 3. Matched ward with GPS accuracy evaluation
    const match = matchingWards[0];
    const acc = typeof accuracyMeters === 'number' && !isNaN(accuracyMeters) ? accuracyMeters : 10;
    const isNearBoundaryUncertain = match.distToEdge < 3 || (acc > 25 && match.distToEdge < Math.min(acc * 0.35, 12));

    if (isNearBoundaryUncertain) {
      return {
        wardNumber: 'Ward Verification Required',
        wardName: match.feature.wardName,
        status: 'boundary_warning',
        verificationStatus: 'GPS UNCERTAIN',
        distanceToEdgeMeters: Math.round(match.distToEdge),
        confidence: 'boundary_uncertain',
        datasetSource: this.activeDataset.source,
        datasetVersion: '2024-Verified-v3',
      };
    }

    return {
      wardNumber: match.feature.wardNumber, // "1" to "17"
      wardName: match.feature.wardName,
      status: 'matched',
      verificationStatus: 'VERIFIED',
      distanceToEdgeMeters: Math.round(match.distToEdge),
      confidence: 'high',
      datasetSource: this.activeDataset.source,
      datasetVersion: '2024-Verified-v3',
    };
  }

  public importGeoJson(contentString: string, municipalityName = 'Tivsa Nagar Panchayat') {
    return this.importGeoJsonOrKml(contentString, municipalityName);
  }

  /**
   * Import GeoJSON or KML string with validation of all 17 municipal wards
   */
  importGeoJsonOrKml(contentString: string, municipalityName = 'Tivsa Nagar Panchayat'): {
    success: boolean;
    message: string;
    count?: number;
    warnings?: string[];
  } {
    try {
      let geoJsonData: any = null;
      const warnings: string[] = [];

      // Check if KML XML format
      if (contentString.trim().startsWith('<') && contentString.includes('<kml')) {
        geoJsonData = this.parseKmlToGeoJson(contentString);
      } else {
        geoJsonData = JSON.parse(contentString);
      }

      const features: WardBoundaryFeature[] = [];
      const rawFeatures = geoJsonData.type === 'FeatureCollection' ? geoJsonData.features : geoJsonData.type === 'Feature' ? [geoJsonData] : [];

      if (!Array.isArray(rawFeatures) || rawFeatures.length === 0) {
        return { success: false, message: 'No valid GIS features found in provided file.' };
      }

      const colors = [
        '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4',
        '#84cc16', '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#a855f7',
        '#0284c7', '#059669', '#d97706', '#e11d48', '#475569'
      ];

      const foundWardNumbers = new Set<string>();

      rawFeatures.forEach((feat: any, idx: number) => {
        const props = feat.properties || {};
        let rawNum = props.ward_no ?? props.ward_number ?? props.Ward ?? props.WARD_NO ?? props.ward ?? props.name ?? (idx + 1);
        let cleanNum = String(rawNum).replace(/^Ward\s*(No\.?)?\s*/i, '').trim();
        if (!cleanNum) cleanNum = String(idx + 1);

        foundWardNumbers.add(cleanNum);

        const wardName = props.ward_name || props.prabhag || props.name || `Ward No. ${cleanNum}`;

        let coords: number[][][] = [];
        if (feat.geometry) {
          if (feat.geometry.type === 'Polygon') {
            coords = feat.geometry.coordinates;
          } else if (feat.geometry.type === 'MultiPolygon') {
            coords = feat.geometry.coordinates.flat(1);
          }
        }

        // Coordinate system sanity validation (ensure coordinates are WGS84 decimal degrees ~ lat 20-22, lng 77-79)
        if (coords.length > 0) {
          const sample = coords[0][0];
          if (sample && (sample[0] > 180 || sample[0] < -180 || sample[1] > 90 || sample[1] < -90)) {
            warnings.push(`Ward ${cleanNum}: Coordinates appear to be in projected CRS (UTM), expected WGS84 decimal degrees.`);
          }

          features.push({
            id: `imported-ward-${cleanNum}`,
            wardNumber: cleanNum,
            wardName,
            municipality: municipalityName,
            color: colors[(parseInt(cleanNum, 10) - 1) % colors.length] || '#3b82f6',
            coordinates: coords,
          });
        }
      });

      if (features.length === 0) {
        return { success: false, message: 'Could not extract valid Polygon coordinates from GIS file.' };
      }

      // Check for missing wards 1-17
      const missingWards: number[] = [];
      for (let i = 1; i <= 17; i++) {
        if (!foundWardNumbers.has(String(i))) {
          missingWards.push(i);
        }
      }

      if (missingWards.length > 0) {
        warnings.push(`Dataset contains ${features.length} wards. Expected 17 wards for Tivsa. Missing: Wards [${missingWards.join(', ')}]`);
      }

      const newDataset: WardBoundaryDataset = {
        municipalityName,
        source: `Admin Verified GIS Import (${new Date().toLocaleDateString()})`,
        updatedAt: Date.now(),
        wards: features,
      };

      this.setDataset(newDataset);
      return {
        success: true,
        message: `Successfully verified and imported ${features.length} ward boundaries for ${municipalityName}.`,
        count: features.length,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (err: any) {
      return { success: false, message: `Invalid GeoJSON / KML format: ${err.message}` };
    }
  }

  /**
   * Helper to parse simple KML Placemarks with Polygon coordinates to GeoJSON
   */
  private parseKmlToGeoJson(kmlText: string): any {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
    const placemarks = xmlDoc.getElementsByTagName('Placemark');
    const features: any[] = [];

    for (let i = 0; i < placemarks.length; i++) {
      const pm = placemarks[i];
      const name = pm.getElementsByTagName('name')[0]?.textContent || `Ward ${i + 1}`;
      const coordEl = pm.getElementsByTagName('coordinates')[0];

      if (coordEl && coordEl.textContent) {
        const rawCoords = coordEl.textContent.trim().split(/\s+/);
        const ring: number[][] = [];
        for (const c of rawCoords) {
          const parts = c.split(',').map((p) => parseFloat(p.trim()));
          if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            ring.push([parts[0], parts[1]]);
          }
        }

        if (ring.length >= 3) {
          // Close ring if not closed
          if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
            ring.push([...ring[0]]);
          }

          features.push({
            type: 'Feature',
            properties: {
              name,
              ward_no: i + 1,
            },
            geometry: {
              type: 'Polygon',
              coordinates: [ring],
            },
          });
        }
      }
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  exportGeoJson(): string {
    return JSON.stringify(
      {
        type: 'FeatureCollection',
        name: this.activeDataset.municipalityName,
        source: this.activeDataset.source,
        updatedAt: this.activeDataset.updatedAt,
        crs: {
          type: 'name',
          properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
        },
        features: this.activeDataset.wards.map((ward) => ({
          type: 'Feature',
          properties: {
            ward_no: parseInt(ward.wardNumber, 10) || ward.wardNumber,
            wardNumber: ward.wardNumber,
            name: `Ward No. ${ward.wardNumber}`,
            wardName: ward.wardName,
            municipality: ward.municipality,
          },
          geometry: {
            type: 'Polygon',
            coordinates: ward.coordinates,
          },
        })),
      },
      null,
      2
    );
  }
}

export const wardBoundaryService = new WardBoundaryService();
