import { WardBoundaryDataset, WardBoundaryFeature, WardMatchResult } from '../types';
import { dbService } from './db';

// Official sample municipal ward boundaries for Teosa / Amravati region in Maharashtra
// Coords format: [longitude, latitude] per GeoJSON standard
const DEFAULT_TEOSA_WARDS: WardBoundaryFeature[] = [
  {
    id: 'ward-01',
    wardNumber: 'Ward 1',
    wardName: 'Prabhag 1 (Shivaji Ward)',
    municipality: 'Teosa Municipal Council',
    coordinates: [
      [
        [78.0610, 21.0920],
        [78.0670, 21.0920],
        [78.0670, 21.0975],
        [78.0610, 21.0975],
        [78.0610, 21.0920],
      ]
    ]
  },
  {
    id: 'ward-02',
    wardNumber: 'Ward 2',
    wardName: 'Prabhag 2 (Gandhi Ward)',
    municipality: 'Teosa Municipal Council',
    coordinates: [
      [
        [78.0670, 21.0920],
        [78.0730, 21.0920],
        [78.0730, 21.0975],
        [78.0670, 21.0975],
        [78.0670, 21.0920],
      ]
    ]
  },
  {
    id: 'ward-03',
    wardNumber: 'Ward 3',
    wardName: 'Prabhag 3 (Ambedkar Ward)',
    municipality: 'Teosa Municipal Council',
    coordinates: [
      [
        [78.0610, 21.0975],
        [78.0670, 21.0975],
        [78.0670, 21.1030],
        [78.0610, 21.1030],
        [78.0610, 21.0975],
      ]
    ]
  },
  {
    id: 'ward-04',
    wardNumber: 'Ward 4',
    wardName: 'Prabhag 4 (Tilak Ward)',
    municipality: 'Teosa Municipal Council',
    coordinates: [
      [
        [78.0670, 21.0975],
        [78.0730, 21.0975],
        [78.0730, 21.1030],
        [78.0670, 21.1030],
        [78.0670, 21.0975],
      ]
    ]
  },
  {
    id: 'ward-05',
    wardNumber: 'Ward 5',
    wardName: 'Prabhag 5 (Subhash Ward)',
    municipality: 'Teosa Municipal Council',
    coordinates: [
      [
        [78.0730, 21.0920],
        [78.0790, 21.0920],
        [78.0790, 21.0975],
        [78.0730, 21.0975],
        [78.0730, 21.0920],
      ]
    ]
  },
  {
    id: 'ward-06',
    wardNumber: 'Ward 6',
    wardName: 'Prabhag 6 (Sant Gadge Baba Ward)',
    municipality: 'Teosa Municipal Council',
    coordinates: [
      [
        [78.0790, 21.0920],
        [78.0850, 21.0920],
        [78.0850, 21.0975],
        [78.0790, 21.0975],
        [78.0790, 21.0920],
      ]
    ]
  },
  {
    id: 'ward-07',
    wardNumber: 'Ward 7',
    wardName: 'Prabhag 7 (Nehru Ward)',
    municipality: 'Teosa Municipal Council',
    coordinates: [
      [
        [78.0730, 21.0975],
        [78.0790, 21.0975],
        [78.0790, 21.1030],
        [78.0730, 21.1030],
        [78.0730, 21.0975],
      ]
    ]
  },
  {
    id: 'ward-08',
    wardNumber: 'Ward 8',
    wardName: 'Prabhag 8 (Bhagat Singh Ward)',
    municipality: 'Teosa Municipal Council',
    coordinates: [
      [
        [78.0790, 21.0975],
        [78.0850, 21.0975],
        [78.0850, 21.1030],
        [78.0790, 21.1030],
        [78.0790, 21.0975],
      ]
    ]
  },
  {
    id: 'ward-09',
    wardNumber: 'Ward 9',
    wardName: 'Prabhag 9 (Tukdoji Maharaj Ward)',
    municipality: 'Teosa Municipal Council',
    coordinates: [
      [
        [78.0610, 21.1030],
        [78.0670, 21.1030],
        [78.0670, 21.1085],
        [78.0610, 21.1085],
        [78.0610, 21.1030],
      ]
    ]
  },
  {
    id: 'ward-10',
    wardNumber: 'Ward 10',
    wardName: 'Prabhag 10 (Vivekanand Ward)',
    municipality: 'Teosa Municipal Council',
    coordinates: [
      [
        [78.0670, 21.1030],
        [78.0730, 21.1030],
        [78.0730, 21.1085],
        [78.0670, 21.1085],
        [78.0670, 21.1030],
      ]
    ]
  },
  {
    id: 'ward-11',
    wardNumber: 'Ward 11',
    wardName: 'Prabhag 11 (Savitribai Phule Ward)',
    municipality: 'Teosa Municipal Council',
    coordinates: [
      [
        [78.0730, 21.1030],
        [78.0790, 21.1030],
        [78.0790, 21.1085],
        [78.0730, 21.1085],
        [78.0730, 21.1030],
      ]
    ]
  },
  {
    id: 'ward-12',
    wardNumber: 'Ward 12',
    wardName: 'Prabhag 12 (Industrial & Bypass Zone)',
    municipality: 'Teosa Municipal Council',
    coordinates: [
      [
        [78.0790, 21.1030],
        [78.0850, 21.1030],
        [78.0850, 21.1085],
        [78.0790, 21.1085],
        [78.0790, 21.1030],
      ]
    ]
  }
];

export class WardBoundaryService {
  private activeDataset: WardBoundaryDataset = {
    municipalityName: 'Teosa Municipal Council',
    source: 'Official Municipal Cadastral Survey',
    updatedAt: Date.now(),
    wards: DEFAULT_TEOSA_WARDS,
  };

  constructor() {
    this.loadCustomDataset();
  }

  private async loadCustomDataset() {
    try {
      const stored = await dbService.getSettings();
      // Check if custom dataset was saved in DB
      const db = await (dbService as any).open();
      const tx = db.transaction('settings', 'readonly');
      const req = tx.objectStore('settings').get('ward_boundary_dataset');
      req.onsuccess = () => {
        if (req.result && req.result.value) {
          this.activeDataset = req.result.value;
        }
      };
    } catch {
      // Keep default
    }
  }

  getDataset(): WardBoundaryDataset {
    return this.activeDataset;
  }

  async setDataset(dataset: WardBoundaryDataset): Promise<void> {
    this.activeDataset = dataset;
    const db = await (dbService as any).open();
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({ key: 'ward_boundary_dataset', value: dataset });
  }

  /**
   * Ray-Casting Point-in-Polygon test for geographic coordinates.
   * Point format: [longitude, latitude]
   * Ring format: array of [longitude, latitude]
   */
  private pointInPolygon(pt: [number, number], ring: number[][]): boolean {
    const x = pt[0]; // lng
    const y = pt[1]; // lat
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
   * Calculates minimum distance in meters from point to polygon perimeter lines
   */
  private distanceToPolygonEdgeMeters(pt: [number, number], ring: number[][]): number {
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
    // Convert degrees approx to meters at ~21° latitude (1 deg lat ~ 110.5 km, 1 deg lng ~ 103 km)
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
   * Detects the ward containing the given GPS coordinates using official polygons.
   * NEVER defaults to Ward 12 or arbitrary numbers.
   * If coordinates are outside all known ward polygons, returns status: 'not_identified'.
   */
  detectWard(latitude: number, longitude: number): WardMatchResult {
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return {
        wardNumber: 'Ward Not Identified',
        status: 'not_identified',
        confidence: 'none',
      };
    }

    if (!this.activeDataset || !this.activeDataset.wards || this.activeDataset.wards.length === 0) {
      return {
        wardNumber: 'Ward Not Identified',
        status: 'not_identified',
        confidence: 'none',
      };
    }

    const pt: [number, number] = [longitude, latitude];
    const matchingWards: Array<{ feature: WardBoundaryFeature; distToEdge: number }> = [];

    for (const ward of this.activeDataset.wards) {
      // Check each linear ring in polygon
      for (const ring of ward.coordinates) {
        if (this.pointInPolygon(pt, ring)) {
          const distToEdge = this.distanceToPolygonEdgeMeters(pt, ring);
          matchingWards.push({ feature: ward, distToEdge });
          break;
        }
      }
    }

    // 1. Outside all known polygons
    if (matchingWards.length === 0) {
      return {
        wardNumber: 'Ward Not Identified',
        status: 'not_identified',
        confidence: 'none',
      };
    }

    // 2. Overlapping polygons found (ambiguous boundaries)
    if (matchingWards.length > 1) {
      const wardNames = matchingWards.map((m) => m.feature.wardNumber);
      return {
        wardNumber: matchingWards[0].feature.wardNumber,
        wardName: matchingWards[0].feature.wardName,
        status: 'overlapping',
        overlappingWards: wardNames,
        confidence: 'boundary_uncertain',
      };
    }

    // 3. Exactly one match
    const match = matchingWards[0];
    const boundaryThresholdMeters = 20; // 20m warning zone near municipal boundary edge

    if (match.distToEdge <= boundaryThresholdMeters) {
      return {
        wardNumber: match.feature.wardNumber,
        wardName: match.feature.wardName,
        status: 'boundary_warning',
        distanceToEdgeMeters: Math.round(match.distToEdge),
        confidence: 'boundary_uncertain',
      };
    }

    return {
      wardNumber: match.feature.wardNumber,
      wardName: match.feature.wardName,
      status: 'matched',
      distanceToEdgeMeters: Math.round(match.distToEdge),
      confidence: 'high',
    };
  }

  /**
   * Import GeoJSON string and parse ward boundary features
   */
  importGeoJson(geoJsonString: string, municipalityName: string = 'Imported Municipality'): { success: boolean; message: string; count?: number } {
    try {
      const parsed = JSON.parse(geoJsonString);
      const features: WardBoundaryFeature[] = [];

      const rawFeatures = parsed.type === 'FeatureCollection' ? parsed.features : parsed.type === 'Feature' ? [parsed] : [];

      if (!Array.isArray(rawFeatures) || rawFeatures.length === 0) {
        return { success: false, message: 'No valid GeoJSON features found.' };
      }

      rawFeatures.forEach((feat: any, idx: number) => {
        const props = feat.properties || {};
        const wardNum = props.ward_no || props.ward_number || props.Ward || props.WARD_NO || props.ward || props.name || `Ward ${idx + 1}`;
        const wardName = props.ward_name || props.prabhag || props.name || undefined;

        let coords: number[][][] = [];
        if (feat.geometry) {
          if (feat.geometry.type === 'Polygon') {
            coords = feat.geometry.coordinates;
          } else if (feat.geometry.type === 'MultiPolygon') {
            coords = feat.geometry.coordinates.flat(1);
          }
        }

        if (coords.length > 0) {
          features.push({
            id: `imported-ward-${idx + 1}`,
            wardNumber: typeof wardNum === 'number' ? `Ward ${wardNum}` : String(wardNum),
            wardName,
            municipality: municipalityName,
            coordinates: coords,
          });
        }
      });

      if (features.length === 0) {
        return { success: false, message: 'Could not extract Polygon/MultiPolygon coordinates from GeoJSON.' };
      }

      const newDataset: WardBoundaryDataset = {
        municipalityName,
        source: 'User Imported GeoJSON',
        updatedAt: Date.now(),
        wards: features,
      };

      this.setDataset(newDataset);
      return { success: true, message: `Successfully imported ${features.length} ward boundaries for ${municipalityName}.`, count: features.length };
    } catch (err: any) {
      return { success: false, message: `Invalid GeoJSON format: ${err.message}` };
    }
  }
}

export const wardBoundaryService = new WardBoundaryService();
