import { Worker, WorkCategory, CapturedPhoto, AppSettings, AddressData } from '../types';

const DB_NAME = 'sumit_boss_db';
const DB_VERSION = 1;

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  overlayLayout: 'classic_bottom',
  minGpsAccuracy: 20, // Warning threshold 20m as requested
  autoRefreshGps: true,
  saveOriginalPhoto: true,
  saveStampedPhoto: true,
  photoQuality: 0.92,
  defaultWorkerId: '',
  defaultCategoryId: '',
  defaultWard: '', // Never hardcode Ward 12
  voiceAnnouncements: true,
  speechVolume: 1.0,
  dateFormat: 'DD/MM/YYYY',
  showMiniMapInStamp: true,
  googleMapsApiKey: '',
  useGoogleMapsStatic: false,
};

const INITIAL_CATEGORIES: WorkCategory[] = [
  {
    id: 'cat-drain',
    name: 'Drain Cleaning',
    nameMr: 'नाली साफसफाई',
    nameHi: 'नाली सफाई',
    description: 'Cleaning of roadside open and underground drainage channels',
    isDefault: true,
    createdAt: Date.now() - 100000,
  },
  {
    id: 'cat-road',
    name: 'Road Cleaning',
    nameMr: 'रस्ता साफसफाई',
    nameHi: 'सड़क सफाई',
    description: 'Main street and arterial road washing and clearance',
    isDefault: true,
    createdAt: Date.now() - 90000,
  },
  {
    id: 'cat-sweeping',
    name: 'Sweeping',
    nameMr: 'झाडू मारण्याचे काम',
    nameHi: 'झाड़ू लगाना',
    description: 'Manual and mechanical sweeping of footpaths and colonies',
    isDefault: true,
    createdAt: Date.now() - 80000,
  },
  {
    id: 'cat-garbage',
    name: 'Garbage Collection',
    nameMr: 'कचरा संकलन',
    nameHi: 'कचरा उठाना',
    description: 'Door-to-door waste and garbage container clearance',
    isDefault: true,
    createdAt: Date.now() - 70000,
  },
  {
    id: 'cat-sanitation',
    name: 'Sanitation Work',
    nameMr: 'स्वच्छता कार्य',
    nameHi: 'स्वच्छता कार्य',
    description: 'Public toilet disinfection and pesticide fogging',
    isDefault: true,
    createdAt: Date.now() - 60000,
  },
  {
    id: 'cat-other',
    name: 'Other Work',
    nameMr: 'इतर काम',
    nameHi: 'अन्य कार्य',
    description: 'Miscellaneous civic maintenance works',
    isDefault: true,
    createdAt: Date.now() - 50000,
  },
];

const INITIAL_WORKERS: Worker[] = [
  {
    id: 'wrk-101',
    name: 'Suresh Patil',
    mobile: '9822014589',
    designation: 'Senior Sanitation Supervisor',
    workCategoryId: 'cat-drain',
    wardNumber: 'Ward 1',
    area: 'Shivaji Chowk, Main Market',
    joiningDate: '2023-01-15',
    notes: 'Drainage and sewage line incharge',
    createdAt: Date.now() - 800000,
  },
  {
    id: 'wrk-102',
    name: 'Ganesh Shinde',
    mobile: '9765432190',
    designation: 'Sanitation Staff',
    workCategoryId: 'cat-sweeping',
    wardNumber: 'Ward 2',
    area: 'Station Road & Ganesh Nagar',
    joiningDate: '2023-06-10',
    notes: 'Morning shift road sweeping',
    createdAt: Date.now() - 600000,
  },
  {
    id: 'wrk-103',
    name: 'Sunita Kamble',
    mobile: '9890123456',
    designation: 'Field Worker',
    workCategoryId: 'cat-garbage',
    wardNumber: 'Ward 3',
    area: 'Ambedkar Colony',
    joiningDate: '2024-02-01',
    notes: 'Door to door waste collection',
    createdAt: Date.now() - 400000,
  }
];

class DatabaseService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;

        if (!db.objectStoreNames.contains('workers')) {
          const workerStore = db.createObjectStore('workers', { keyPath: 'id' });
          workerStore.createIndex('name', 'name', { unique: false });
        }

        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
          photoStore.createIndex('timestamp', 'timestamp', { unique: false });
          photoStore.createIndex('workerId', 'workerId', { unique: false });
          photoStore.createIndex('workCategoryId', 'workCategoryId', { unique: false });
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
        // Seed default categories if empty
        await this.ensureSeedData(db);
        resolve(db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  private async ensureSeedData(db: IDBDatabase): Promise<void> {
    return new Promise((resolve) => {
      const tx = db.transaction(['categories', 'workers', 'settings'], 'readwrite');
      const catStore = tx.objectStore('categories');
      const countReq = catStore.count();

      countReq.onsuccess = () => {
        if (countReq.result === 0) {
          INITIAL_CATEGORIES.forEach((c) => catStore.put(c));
        }
      };

      const workerStore = tx.objectStore('workers');
      const workerCountReq = workerStore.count();
      workerCountReq.onsuccess = () => {
        if (workerCountReq.result === 0) {
          INITIAL_WORKERS.forEach((w) => workerStore.put(w));
        }
      };

      const settingsStore = tx.objectStore('settings');
      const getSettingsReq = settingsStore.get('app_settings');
      getSettingsReq.onsuccess = () => {
        if (!getSettingsReq.result) {
          settingsStore.put({ key: 'app_settings', value: DEFAULT_SETTINGS });
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve(); // continue anyway
    });
  }

  // --- WORKERS ---
  async getWorkers(): Promise<Worker[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workers', 'readonly');
      const req = tx.objectStore('workers').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async saveWorker(worker: Worker): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workers', 'readwrite');
      const req = tx.objectStore('workers').put(worker);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteWorker(id: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workers', 'readwrite');
      const req = tx.objectStore('workers').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- CATEGORIES ---
  async getCategories(): Promise<WorkCategory[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readonly');
      const req = tx.objectStore('categories').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async saveCategory(cat: WorkCategory): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readwrite');
      const req = tx.objectStore('categories').put(cat);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteCategory(id: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readwrite');
      const req = tx.objectStore('categories').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- PHOTOS ---
  async getPhotos(): Promise<CapturedPhoto[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readonly');
      const req = tx.objectStore('photos').getAll();
      req.onsuccess = () => {
        const photos = (req.result || []) as CapturedPhoto[];
        // Sort newest first
        photos.sort((a, b) => b.timestamp - a.timestamp);
        resolve(photos);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getPhotoById(id: string): Promise<CapturedPhoto | null> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readonly');
      const req = tx.objectStore('photos').get(id);
      req.onsuccess = () => resolve(req.result || null);
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

  // --- ADDRESS CACHE ---
  async getCachedAddress(lat: number, lng: number): Promise<AddressData | null> {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction('address_cache', 'readonly');
      const req = tx.objectStore('address_cache').get(key);
      req.onsuccess = () => {
        if (req.result && req.result.address) {
          // Check expiration (7 days)
          const isFresh = Date.now() - req.result.cachedAt < 7 * 24 * 60 * 60 * 1000;
          if (isFresh) {
            resolve(req.result.address);
            return;
          }
        }
        resolve(null);
      };
      req.onerror = () => resolve(null);
    });
  }

  async setCachedAddress(lat: number, lng: number, address: AddressData): Promise<void> {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction('address_cache', 'readwrite');
      tx.objectStore('address_cache').put({
        key,
        address,
        cachedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  // --- BACKUP & RESTORE ---
  async exportBackup(): Promise<string> {
    const [workers, categories, photos, settings] = await Promise.all([
      this.getWorkers(),
      this.getCategories(),
      this.getPhotos(),
      this.getSettings(),
    ]);

    const backupData = {
      app: 'Sumit Boss',
      version: 1,
      exportedAt: new Date().toISOString(),
      workers,
      categories,
      photos,
      settings,
    };

    return JSON.stringify(backupData, null, 2);
  }

  async importBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || parsed.app !== 'Sumit Boss') {
        return { success: false, message: 'Invalid backup file for Sumit Boss.' };
      }

      const db = await this.open();
      const tx = db.transaction(['workers', 'categories', 'photos', 'settings'], 'readwrite');

      if (Array.isArray(parsed.workers)) {
        const wStore = tx.objectStore('workers');
        parsed.workers.forEach((w: Worker) => wStore.put(w));
      }

      if (Array.isArray(parsed.categories)) {
        const cStore = tx.objectStore('categories');
        parsed.categories.forEach((c: WorkCategory) => cStore.put(c));
      }

      if (Array.isArray(parsed.photos)) {
        const pStore = tx.objectStore('photos');
        parsed.photos.forEach((p: CapturedPhoto) => pStore.put(p));
      }

      if (parsed.settings) {
        tx.objectStore('settings').put({ key: 'app_settings', value: parsed.settings });
      }

      return new Promise((resolve) => {
        tx.oncomplete = () => resolve({ success: true, message: 'Database restored successfully.' });
        tx.onerror = () => resolve({ success: false, message: 'Failed to write restored records.' });
      });
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to parse JSON file.' };
    }
  }
}

export const dbService = new DatabaseService();
