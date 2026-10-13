# Sumit Boss — GPS Map Camera & Worker Documentation Android App

**Sumit Boss** is a professional Android application built for municipal field supervisors, sanitation inspectors, and field documentation teams. It captures high-resolution location-stamped photographs with baked-in verified GPS coordinates, reverse-geocoded postal addresses, worker details, and work categories, and exports official A4 PDF audit reports.

---

## 🌟 Key Features

1. **GPS Map Camera with Baked-In Watermark Overlays**
   - High-resolution camera viewfinder supporting front/rear camera toggle and torch/flash controls.
   - Watermarks are burned directly into the saved image canvas (not just an on-screen preview).
   - 4 Professional Watermark Layouts:
     - **Classic Bottom Banner** (Default high-contrast dual-column audit layout)
     - **Modern Glassmorphism Card** (Floating badges and metadata)
     - **Sidebar Compact** (Left/right vertical telemetry rail)
     - **Full Technical Inspector** (Audit-grade telemetry breakdown with accuracy indicators)
   - Optional mini-radar/grid map badge embedded in the stamp.
   - Saves both stamped image and optional unmodified original image.

2. **Accurate GPS & Strict Postal PIN Code Integrity**
   - Live GPS tracking via device Geolocation and Android Fused Location Provider.
   - Real-time display of horizontal accuracy in meters (±X m) and fix timestamps.
   - Configurable GPS accuracy threshold with low-accuracy warnings (*"GPS accuracy is low. Move to an open area and try again"*).
   - OpenStreetMap Nominatim reverse geocoding resolving Building, Road, Locality/Village, Taluka/Tehsil, District, State, and PIN code.
   - **Strict PIN Code Verification**: Validates standard 6-digit Indian postal PIN codes (`/^[1-9][0-9]{5}$/`). Never invents or fabricates PIN codes. If unavailable, clearly displays *"PIN code unavailable"*.
   - Specialized handling for Maharashtra administrative boundaries (Taluka, District, State).

3. **Worker Management**
   - Complete CRUD operations: Add, edit, search, and delete workers with confirmation.
   - Fields: Worker ID, Name, Mobile Number, Designation, Work Category, Ward Number, Area, Joining Date, and Notes.
   - 1-tap worker activation before taking photos.

4. **Work Category Management**
   - Pre-configured municipal categories:
     - **Drain Cleaning** (*नाली साफसफाई* / *नाली सफाई*)
     - **Sweeping** (*झाडू मारण्याचे काम* / *झाड़ू लगाना*)
     - **Road Cleaning** (*रस्ता साफसफाई* / *सड़क सफाई*)
     - **Garbage Collection** (*कचरा संकलन* / *कचरा उठाना*)
     - **Sanitation Work** (*स्वच्छता कार्य*)
     - **Other Work** (*इतर काम* / *अन्य कार्य*)
   - Editable, customizable, and filterable.

5. **Saved Photos Gallery & Location History**
   - Local offline database storing photo records and thumbnails.
   - Multi-filter support: Filter by Date Range, Worker, Work Category, and Ward Number.
   - Interactive Leaflet map displaying GPS pins for every captured photo.
   - Fullscreen Photo Inspector with side-by-side Stamped vs. Original toggle.
   - Image export with standardized naming: `SumitBoss_YYYYMMDD_HHMMSS.jpg`.

6. **Official A4 PDF Audit Reports**
   - Generates multi-page formatted A4 PDF reports with photo thumbnails, timestamps, worker names, categories, wards, GPS coordinates, accuracy, and verified addresses.
   - Printable and shareable via native Android share sheet (including WhatsApp).

7. **Multi-Language Support & Accessibility**
   - Full UI localization in **English**, **मराठी (Marathi)**, and **हिंदी (Hindi)**.
   - Accessibility-first with large touch targets, high contrast, and ARIA labels.
   - Text-to-Speech (TTS) voice announcements (*"Welcome to Sumit Boss"*, *"Camera opened"*, *"GPS location acquired"*, *"Photo captured successfully"*, *"GPS accuracy is low"*).

8. **Offline Functionality & Data Safety**
   - Full offline operation: captures photos and coordinates locally even without cellular data.
   - Full JSON database export and restore functionality to prevent data loss.

---

## 📁 Repository Structure

```
.
├── .github/
│   └── workflows/
│       └── android-build.yml       # GitHub Actions workflow for building Android APK
├── android/
│   ├── app/
│   │   ├── build.gradle            # App-level Gradle build configuration
│   │   └── src/
│   │       └── main/
│   │           ├── AndroidManifest.xml # Permissions (CAMERA, GPS, STORAGE)
│   │           ├── java/com/sumitboss/gpscamera/MainActivity.java
│   │           └── res/            # Strings, Colors, Themes, and Adaptive Icons
│   ├── build.gradle                # Root Gradle configuration
│   ├── settings.gradle             # Project module definitions
│   ├── gradle.properties           # Memory and AndroidX flags
│   └── gradlew                     # Gradle executable wrapper
├── capacitor.config.json           # Capacitor Android bridge configuration
├── src/
│   ├── components/                 # React UI components
│   │   ├── CameraView.tsx          # Real camera preview, overlay & canvas stamping
│   │   ├── Dashboard.tsx           # Home dashboard with 8 primary action cards
│   │   ├── MapView.tsx             # Interactive Leaflet GPS map
│   │   ├── WorkerManager.tsx       # Worker roster management
│   │   ├── CategoryManager.tsx     # Work categories management
│   │   ├── PhotoGallery.tsx        # Photo gallery & full-screen inspector
│   │   ├── LocationHistoryView.tsx # Map marker trail & history timeline
│   │   ├── ReportsView.tsx         # A4 PDF report exporter
│   │   └── SettingsView.tsx        # Application settings & DB backup
│   ├── i18n/
│   │   └── translations.ts         # English, Marathi, Hindi translations
│   ├── services/
│   │   ├── db.ts                   # IndexedDB storage and seed data
│   │   ├── gps.ts                  # Device GPS & Nominatim reverse geocoder
│   │   ├── photoStamper.ts         # High-resolution HTML5 canvas watermark engine
│   │   ├── pdfReport.ts            # A4 PDF generation service
│   │   └── tts.ts                  # Web Speech Synthesis TTS engine
│   ├── types/                      # TypeScript data definitions
│   ├── App.tsx                     # Main application container
│   ├── index.css                   # Tailwind styles and mobile scrollbars
│   └── main.tsx                    # React entry point
└── package.json
```

---

## 🚀 Building the Android APK

### Option A: Automated Build via GitHub Actions (Recommended)

1. **Commit and push** the code to your GitHub repository:
   ```bash
   git add .
   git commit -m "Build Sumit Boss complete Android application"
   git push origin main
   ```
2. Navigate to the **Actions** tab in your GitHub repository.
3. Select the workflow titled **Build Sumit Boss Android APK**.
4. The build will execute automatically on push to `main` (or you can click **Run workflow** manually).
5. Once the build finishes successfully (typically in 2-3 minutes), scroll down to the **Artifacts** section at the bottom of the workflow run summary.
6. Download **`sumit-boss-gps-map-camera-apk`**, extract the ZIP archive, and install **`SumitBoss-GPS-Map-Camera.apk`** on your Android device.

### Option B: Local Build via Android Studio

1. **Install dependencies and build web assets**:
   ```bash
   npm install
   npm run build
   npx cap sync android
   ```
2. **Open the Android project**:
   - Launch **Android Studio**.
   - Click **Open** and select the `/android` directory of this repository.
3. **Build the APK**:
   - In Android Studio, select **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - Alternatively, run from terminal:
     ```bash
     cd android
     ./gradlew assembleDebug
     ```
   - The generated APK will be located at:
     `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📱 Installing and Running on Android Device

1. Copy the generated `.apk` file to your Android phone (via USB cable, Google Drive, or WhatsApp).
2. On your phone, tap the `.apk` file to install.
3. If prompted with *"Install unknown apps"*, enable permission for your browser or file manager.
4. Open **Sumit Boss**.
5. When prompted, grant:
   - **Camera permission** (required for capturing photos)
   - **Location permission (Precise / Fine Location)** (required for GPS coordinates and reverse geocoding)
   - **Storage / Media permission** (required for saving stamped images to device gallery)

---

## 🧪 Verification & Testing Checklist

- [x] **Application Startup**: Opens smoothly without crashing; branding displayed as **Sumit Boss**.
- [x] **Home Dashboard**: 8 clearly labelled buttons navigating to all screens with live date/time and GPS status.
- [x] **Camera Stream**: Supports rear camera, front camera, torch toggle, and anti-duplicate capture lock.
- [x] **Watermark Baking**: Overlays (Worker, Category, Ward, Lat, Lng, Accuracy, Address, PIN, Date/Time) are permanently rendered into saved JPEG images via HTML5 Canvas.
- [x] **Strict PIN Code Validation**: Validates 6-digit postal PIN codes; shows *"PIN code unavailable"* if unverified.
- [x] **Worker Management**: Add, edit, delete, search, and 1-tap select workers for photo stamps.
- [x] **Work Categories**: Preloaded with Drain Cleaning, Sweeping, Road Cleaning, Garbage Collection, Sanitation Work, Other Work.
- [x] **Saved Photos Gallery**: Searchable, filterable by worker/category/ward, full-screen inspector, and single-click download.
- [x] **PDF Reports**: Generates formatted A4 PDF reports with photo thumbnails and field metrics.
- [x] **Offline Capabilities**: Captures photos and saves metadata locally without requiring an active internet connection.
- [x] **Multi-Language**: Instant toggle between English, Marathi (मराठी), and Hindi (हिंदी).
- [x] **Voice TTS**: Speaks events (*"Welcome to Sumit Boss"*, *"Photo captured successfully"*, etc.).
- [x] **CI/CD Ready**: Authoritative GitHub Actions workflow (`.github/workflows/android-build.yml`) configured for automated APK compilation.
