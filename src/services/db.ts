import { CapturedPhoto, AppSettings, AddressData, WardBoundaryDataset } from '../types';

const DB_NAME = 'sumit_boss_gps_db';
const DB_VERSION = 2;

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  overlayLayout: 'vertical_stamp',
  minGpsAccuracy: 20, // Warning threshold 20m as requested
  autoRefreshGps: true,
  saveOriginalPhoto: true,
  saveStampedPhoto: true,
  photoQuality: 1.0,
  voiceAnnouncements: true,
  speechVolume: 1.0,
  dateFormat: 'DD-MM-YYYY',
  showMiniMapInStamp: false,
  googleMapsApiKey: '',
  useGoogleMapsStatic: false,
};

class DatabaseService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  public open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;

        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
          photoStore.createIndex('timestamp', 'timestamp', { unique: false });
          photoStore.createIndex('wardNumber', 'wardNumber', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('address_cache')) {
          db.createObjectStore('address_cache', { keyPath: 'key' });
        }
      };

      request.onsuccess = async () => {
        const db = request.result;
        await this.ensureSeedSettings(db);
        resolve(db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  private async ensureSeedSettings(db: IDBDatabase): Promise<void> {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('settings', 'readwrite');
        const settingsStore = tx.objectStore('settings');
        const getSettingsReq = settingsStore.get('app_settings');
        getSettingsReq.onsuccess = () => {
          if (!getSettingsReq.result) {
            settingsStore.put({ key: 'app_settings', value: DEFAULT_SETTINGS });
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // --- PHOTOS ---
  async getPhotos(): Promise<CapturedPhoto[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readonly');
      const store = tx.objectStore('photos');
      const index = store.index('timestamp');
      const req = index.getAll();
      req.onsuccess = () => {
        const results = req.result || [];
        // Sort newest first
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async savePhoto(photo: CapturedPhoto): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readwrite');
      const req = tx.objectStore('photos').put(photo);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deletePhoto(id: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readwrite');
      const req = tx.objectStore('photos').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- SETTINGS ---
  async getSettings(): Promise<AppSettings> {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const req = tx.objectStore('settings').get('app_settings');
      req.onsuccess = () => {
        if (req.result && req.result.value) {
          resolve({ ...DEFAULT_SETTINGS, ...req.result.value });
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      };
      req.onerror = () => resolve(DEFAULT_SETTINGS);
    });
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const req = tx.objectStore('settings').put({ key: 'app_settings', value: settings });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- WARD BOUNDARY DATASET ---
  async getWardDataset(): Promise<WardBoundaryDataset | null> {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const req = tx.objectStore('settings').get('ward_boundary_dataset');
      req.onsuccess = () => {
        resolve(req.result ? req.result.value : null);
      };
      req.onerror = () => resolve(null);
    });
  }

  async saveWardDataset(dataset: WardBoundaryDataset): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const req = tx.objectStore('settings').put({ key: 'ward_boundary_dataset', value: dataset });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- ADDRESS CACHE ---
  private getCacheKey(lat: number, lng: number): string {
    return `${lat.toFixed(4)}_${lng.toFixed(4)}`;
  }

  async getCachedAddress(lat: number, lng: number): Promise<AddressData | null> {
    const db = await this.open();
    const key = this.getCacheKey(lat, lng);
    return new Promise((resolve) => {
      const tx = db.transaction('address_cache', 'readonly');
      const req = tx.objectStore('address_cache').get(key);
      req.onsuccess = () => {
        if (req.result && Date.now() - req.result.cachedAt < 86400000 * 7) {
          resolve(req.result.data);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  }

  async cacheAddress(lat: number, lng: number, address: AddressData): Promise<void> {
    const db = await this.open();
    const key = this.getCacheKey(lat, lng);
    return new Promise((resolve) => {
      const tx = db.transaction('address_cache', 'readwrite');
      tx.objectStore('address_cache').put({
        key,
        data: address,
        cachedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  async setCachedAddress(lat: number, lng: number, address: AddressData): Promise<void> {
    return this.cacheAddress(lat, lng, address);
  }
}

export const dbService = new DatabaseService();
