# SUMIT BOSS — GPS Camera & Municipal Ward Documentation Android App

**SUMIT BOSS** (`com.sumitboss.gpscamera`) is an Android application designed for high-precision field documentation, GPS camera photo stamping, and municipal administration. Built for Tivsa Nagar Panchayat (LGD Code: 276289), Dist. Amravati, Maharashtra.

---

## 🌟 Core Features

1. **Native High-Resolution Photo Stamping Engine (`ImageStampModule`)**
   - Composites telemetry directly onto the full camera sensor Bitmap buffer using native Android `Canvas`, `Paint`, `Typeface`, and subpixel text rendering.
   - Eliminates WebView preview scaling blur; text, badges, vector icons, and map thumbnails are rendered at crystal-clear native sensor resolution.
   - Stamped output is saved directly into Android MediaStore under `Pictures/SUMIT BOSS` at JPEG 100% quality.

2. **Official 17 Municipal Ward Point-in-Polygon Detection**
   - **Target Municipality**: Tivsa Nagar Panchayat (LGD Code: 276289), Dist. Amravati, Maharashtra.
   - **Total Wards**: 17 official delimited wards.
   - **Ground-Truth Aligned**: Anandwadi and Gaothan North mapped accurately to **Ward No. 1**.
   - If coordinates fall outside the verified municipal polygons, status clearly displays `Ward verification pending`.

3. **Ultra-Precise GPS & Road Corridor Sanitization**
   - Live GPS tracking via Android Fused Location Provider with horizontal accuracy indicators (±Xm).
   - Sanitized reverse geocoding identifying local corridors such as **Satar Gaon Road / Chandur Bazar Road** in **Anandwadi, Tivsa Nagar Panchayat**, filtering out distant rural village mislabels.
   - Enforces verified Indian postal PIN code **444903**.

4. **Studio-Quality Neural AI Marathi Welcome Voice**
   - Dedicated AI voice system powered by neural text-to-speech.
   - Automatically plays on cold launch:
     > **"सुमित बॉस ॲप्लिकेशनमध्ये आपले स्वागत आहे."**
   - Plays natively via Android `MediaPlayer` reading from pre-bundled assets or persistent local cache without requiring active internet connectivity or falling back to robotic Google TTS.
   - Session-guarded to prevent repeating across screen changes.

5. **Interactive GIS Map & Google Maps Integration**
   - Displays all 17 municipal ward boundary polygons overlaid on satellite imagery.
   - Direct **"Open in Google Maps"** navigation button to launch coordinates directly in Google Maps.

---

## 📁 Repository Structure

```
SUMIT-BOSS/
├── .github/
│   └── workflows/
│       └── android-build.yml       # GitHub Actions automated APK build workflow
├── android/
│   ├── app/
│   │   ├── build.gradle            # App-level build config with release signing
│   │   └── src/
│   │       └── main/
│   │           ├── AndroidManifest.xml # Permissions (CAMERA, GPS, MEDIASTORE)
│   │           ├── assets/
│   │           │   └── welcome_marathi.wav # Pre-bundled 24kHz neural Marathi audio
│   │           ├── java/com/sumitboss/gpscamera/
│   │           │   ├── MainActivity.java     # BridgeActivity with plugin registration
│   │           │   ├── ImageStampModule.java # Native HD Android Canvas/Paint module
│   │           │   ├── SumitVoicePlugin.java # Native Neural AI Voice module
│   │           │   └── SumitMediaPlugin.java # Native MediaStore & Gallery saver
│   │           └── res/            # Strings ("SUMIT BOSS"), icons, and themes
│   ├── build.gradle                # Root project buildscript (AGP 8.7.3)
│   ├── settings.gradle             # Module settings
│   ├── gradle.properties           # Memory and AndroidX flags
│   ├── gradlew                     # Executable Gradle wrapper (Linux/macOS)
│   ├── gradlew.bat                 # Executable Gradle wrapper (Windows)
│   └── gradle/
│       └── wrapper/
│           ├── gradle-wrapper.jar  # Gradle distribution launcher
│           └── gradle-wrapper.properties # Gradle 8.11.1
├── src/
│   ├── components/                 # React UI components (CameraView, GoogleMapView, etc.)
│   ├── services/
│   │   ├── gps.ts                  # High-accuracy GPS & address sanitization
│   │   ├── wardBoundaryService.ts  # Turf.js 17-Ward GIS point-in-polygon engine
│   │   ├── photoExportService.ts   # Calls ImageStampModule native plugin
│   │   └── tts.ts                  # Neural welcome voice client
│   └── types/                      # TypeScript definitions
├── public/
│   └── assets/audio/
│       └── welcome_marathi.wav     # Studio neural Marathi WAV audio
├── capacitor.config.json           # Capacitor Android configuration
├── package.json                    # Dependencies & build scripts
├── package-lock.json               # Deterministic dependency lockfile
├── tsconfig.json                   # TypeScript compiler options
├── vite.config.ts                  # Vite build configuration
└── README.md
```

---

## 🚀 Automated APK Generation via GitHub Actions

This repository is pre-configured with a continuous integration workflow: **`.github/workflows/android-build.yml`**.

### How to Upload to GitHub and Generate APK:

1. **Push or Upload this project to a new GitHub repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of complete SUMIT BOSS Android project"
   git branch -M main
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
   git push -u origin main
   ```

2. **Trigger the Workflow**:
   - The build runs **automatically** on every push to `main`.
   - To trigger manually:
     1. Open your repository on GitHub.
     2. Click on the **Actions** tab.
     3. In the left sidebar, click **Build SUMIT BOSS Android APK**.
     4. Click **Run workflow** (select `release` or `debug`).

3. **Download the Generated APK**:
   - Once the workflow completes (green checkmark, ~2-3 minutes), click on the completed run.
   - Scroll down to the **Artifacts** section at the bottom of the page.
   - Click on **`SUMIT-BOSS-APK`** to download the ZIP file.
   - Extract the ZIP to obtain **`SUMIT-BOSS-release.apk`**.

---

## 📱 Sideloading & Installing on Android

1. Transfer **`SUMIT-BOSS-release.apk`** to your Android smartphone (via USB, WhatsApp, or Google Drive).
2. Tap the APK file to install.
3. If prompted, toggle on **"Allow from this source"** in your phone's installation settings.
4. Launch **SUMIT BOSS**:
   - The neural Marathi welcome voice (*"सुमित बॉस ॲप्लिकेशनमध्ये आपले स्वागत आहे."*) will play clearly on initial cold start.
   - Grant **Camera**, **Precise Location (GPS)**, and **Photos/Media** permissions when prompted.
5. Photos captured using the camera will be stamped at full camera sensor resolution with the complete SUMIT BOSS telemetry panel and automatically saved to your phone's gallery in the `SUMIT BOSS` album.

---

## 🔐 Optional Release Keystore Configuration

By default, the workflow produces an installable release APK signed with Android's standard debug key for easy sideloading without errors.

To sign with your own private production keystore for Google Play Store release:
1. In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions**.
2. Add the following repository secrets:
   - `KEYSTORE_BASE64`: Base64-encoded string of your `.jks` or `.keystore` file (`base64 -w 0 my-release-key.jks`).
   - `KEYSTORE_PASSWORD`: Password for your keystore.
   - `KEY_ALIAS`: Key alias name.
   - `KEY_PASSWORD`: Password for the key alias.
3. Subsequent workflow runs will automatically detect these secrets and produce a cryptographically signed production APK.
