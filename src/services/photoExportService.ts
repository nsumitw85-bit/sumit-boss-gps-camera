import { registerPlugin, Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface NativeStampOptions {
  base64?: string;
  photoPath?: string;
  filename: string;
  addressText: string;
  wardNumber: string;
  wardName?: string;
  gpsCoordsText: string;
  pinCodeText: string;
  dateText: string;
  timeText: string;
  latitude?: number;
  longitude?: number;
  mapTileBase64?: string | null;
  gpsData?: {
    addressText: string;
    wardNumber: string;
    wardName?: string;
    gpsCoordsText: string;
    pinCodeText: string;
    dateText: string;
    timeText: string;
    latitude?: number;
    longitude?: number;
    mapTileBase64?: string | null;
  };
}

interface ImageStampModulePluginInterface {
  stampPhoto(options: NativeStampOptions): Promise<{
    success: boolean;
    stampedDataUrl: string;
    width?: number;
    height?: number;
    uri?: string;
    filePath?: string;
    message?: string;
  }>;
  stampAndSavePhoto(options: NativeStampOptions): Promise<{
    success: boolean;
    stampedDataUrl: string;
    width?: number;
    height?: number;
    uri?: string;
    filePath?: string;
    message?: string;
  }>;
}

interface SumitMediaPluginInterface {
  stampAndSavePhoto(options: NativeStampOptions): Promise<{
    success: boolean;
    stampedDataUrl: string;
    width?: number;
    height?: number;
    uri?: string;
    filePath?: string;
    message?: string;
  }>;
  savePhotoToGallery(options: {
    base64: string;
    filename: string;
  }): Promise<{ success: boolean; message?: string; uri?: string; filePath?: string }>;
  shareToWhatsApp(options: {
    base64: string;
    filename: string;
  }): Promise<{ success: boolean; isWhatsAppInstalled?: boolean }>;
}

const ImageStampModule = registerPlugin<ImageStampModulePluginInterface>('ImageStampModule');
const SumitMedia = registerPlugin<SumitMediaPluginInterface>('SumitMedia');

export interface ExportResult {
  success: boolean;
  message: string;
  error?: string;
}

export class PhotoExportService {
  /**
   * Dedicated Native Android Photo-Stamping Engine call.
   * Renders the complete GPS information panel directly onto the original full-resolution
   * camera Android Bitmap using native Canvas, Paint, and subpixel text rendering.
   */
  public static async stampAndSaveNative(options: {
    rawBase64: string;
    filename: string;
    addressText: string;
    wardNumber: string;
    wardName?: string;
    gpsCoordsText: string;
    pinCodeText: string;
    dateText: string;
    timeText: string;
    latitude?: number;
    longitude?: number;
    mapTileBase64?: string | null;
  }): Promise<{ success: boolean; stampedDataUrl: string; message: string; uri?: string; filePath?: string }> {
    const cleanBase64 = this.extractBase64(options.rawBase64);
    const safeFilename = options.filename.endsWith('.jpg') || options.filename.endsWith('.jpeg')
      ? options.filename
      : `${options.filename}.jpg`;

    const stampPayload: NativeStampOptions = {
      base64: cleanBase64,
      filename: safeFilename,
      addressText: options.addressText,
      wardNumber: options.wardNumber,
      wardName: options.wardName || '',
      gpsCoordsText: options.gpsCoordsText,
      pinCodeText: options.pinCodeText,
      dateText: options.dateText,
      timeText: options.timeText,
      latitude: options.latitude,
      longitude: options.longitude,
      mapTileBase64: options.mapTileBase64 ? this.extractBase64(options.mapTileBase64) : null,
      gpsData: {
        addressText: options.addressText,
        wardNumber: options.wardNumber,
        wardName: options.wardName || '',
        gpsCoordsText: options.gpsCoordsText,
        pinCodeText: options.pinCodeText,
        dateText: options.dateText,
        timeText: options.timeText,
        latitude: options.latitude,
        longitude: options.longitude,
        mapTileBase64: options.mapTileBase64 ? this.extractBase64(options.mapTileBase64) : null,
      },
    };

    // 1. Primary: Use dedicated ImageStampModule native plugin
    try {
      const res = await ImageStampModule.stampAndSavePhoto(stampPayload);
      if (res && res.success && res.stampedDataUrl) {
        return {
          success: true,
          stampedDataUrl: res.stampedDataUrl,
          message: res.message || 'Photo stamped with native HD typography via ImageStampModule.',
          uri: res.uri,
          filePath: res.filePath,
        };
      }
    } catch (pluginErr) {
      console.warn('ImageStampModule call failed, falling back to SumitMedia:', pluginErr);
    }

    // 2. Secondary fallback: SumitMedia native plugin
    const res = await SumitMedia.stampAndSavePhoto(stampPayload);

    if (!res || !res.success || !res.stampedDataUrl) {
      throw new Error(res?.message || 'Native photo stamping failed');
    }

    return {
      success: true,
      stampedDataUrl: res.stampedDataUrl,
      message: res.message || 'Photo stamped with native HD typography and saved to Gallery.',
      uri: res.uri,
      filePath: res.filePath,
    };
  }
  /**
   * Helper to strip data URL prefix and return clean base64 string
   */
  private static extractBase64(dataUrl: string): string {
    const commaIndex = dataUrl.indexOf(',');
    return commaIndex >= 0 ? dataUrl.substring(commaIndex + 1) : dataUrl;
  }

  /**
   * Helper to convert base64 to Blob
   */
  private static base64ToBlob(base64: string, mimeType = 'image/jpeg'): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Save the full composite GPS-stamped photo to device Gallery / Storage
   * - Uses Android MediaStore via native plugin for Android 10+ (saved in Pictures/SUMIT BOSS)
   * - Uses MediaScanner for older Android
   * - Fallback to Capacitor Filesystem and Web download blob
   */
  public static async savePhotoToDevice(
    photoDataUrl: string,
    filename: string
  ): Promise<ExportResult> {
    if (!photoDataUrl) {
      throw new Error('Photo data is missing.');
    }

    const safeFilename = filename.endsWith('.jpg') || filename.endsWith('.jpeg')
      ? filename
      : `${filename}.jpg`;

    const base64 = this.extractBase64(photoDataUrl);

    // 1. If on native Android, use SumitMediaPlugin (MediaStore to Pictures/SUMIT BOSS)
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await SumitMedia.savePhotoToGallery({
          base64,
          filename: safeFilename,
        });

        if (result && result.success) {
          // Also persist directly with Capacitor Filesystem Directory.Documents
          try {
            await Filesystem.writeFile({
              path: `Pictures/SUMIT_BOSS/${safeFilename}`,
              data: base64,
              directory: Directory.Documents,
              recursive: true,
            });
          } catch {
            try {
              await Filesystem.writeFile({
                path: safeFilename,
                data: base64,
                directory: Directory.Documents,
                recursive: true,
              });
            } catch (innerFsErr) {
              console.debug('Capacitor Filesystem secondary write notice:', innerFsErr);
            }
          }

          return {
            success: true,
            message: 'Photo saved successfully to Gallery.',
          };
        }
      } catch (nativeErr) {
        console.warn('Native SumitMedia plugin save error, attempting Filesystem fallback:', nativeErr);

        // Fallback 1: Capacitor Filesystem to Documents
        try {
          await Filesystem.writeFile({
            path: safeFilename,
            data: base64,
            directory: Directory.Documents,
            recursive: true,
          });

          return {
            success: true,
            message: 'Photo saved successfully to Gallery / Documents.',
          };
        } catch (fsErr) {
          console.error('Filesystem save error:', fsErr);
          throw new Error((fsErr as Error)?.message || (nativeErr as Error)?.message || 'Failed to save photo to device storage.');
        }
      }
    }

    // 2. Web / Browser fallback
    try {
      const blob = this.base64ToBlob(base64, 'image/jpeg');
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 1000);

      return {
        success: true,
        message: 'Photo saved successfully to Gallery.',
      };
    } catch (webErr) {
      console.error('Web download failed:', webErr);
      throw new Error((webErr as Error)?.message || 'Download failed in this browser.');
    }
  }

  /**
   * Share the captured GPS-stamped photo directly to WhatsApp or Android share sheet
   * - Photo image only (NO automatic caption/text)
   * - Direct WhatsApp intent if installed, with system chooser fallback
   */
  public static async sharePhotoViaWhatsApp(options: {
    photoDataUrl: string;
    filename: string;
    addressText?: string;
    wardNumber?: string;
    latitude?: number;
    longitude?: number;
    timestampStr?: string;
  }): Promise<ExportResult> {
    return this.sharePhotoToWhatsApp(options.photoDataUrl, options.filename);
  }

  public static async sharePhotoToWhatsApp(
    photoDataUrl: string,
    filename: string
  ): Promise<ExportResult> {
    if (!photoDataUrl) {
      throw new Error('Photo data is missing.');
    }

    const safeFilename = filename.endsWith('.jpg') || filename.endsWith('.jpeg')
      ? filename
      : `${filename}.jpg`;

    const base64 = this.extractBase64(photoDataUrl);

    // 1. If on native Android, use SumitMediaPlugin
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await SumitMedia.shareToWhatsApp({
          base64,
          filename: safeFilename,
        });

        if (result && result.success) {
          return {
            success: true,
            message: result.isWhatsAppInstalled
              ? 'Opening WhatsApp...'
              : 'Opening share menu...',
          };
        }
      } catch (nativeErr) {
        console.warn('Native SumitMedia share error, falling back to Capacitor Share plugin:', nativeErr);

        // Fallback: Write to cache using Filesystem and share via Capacitor Share
        try {
          const writeResult = await Filesystem.writeFile({
            path: safeFilename,
            data: base64,
            directory: Directory.Cache,
            recursive: true,
          });

          await Share.share({
            files: [writeResult.uri],
            // Note: NO text or title to ensure empty caption
          });

          return {
            success: true,
            message: 'Share dialog opened.',
          };
        } catch (sharePluginErr) {
          console.error('Capacitor Share plugin failed:', sharePluginErr);
          throw new Error((sharePluginErr as Error)?.message || (nativeErr as Error)?.message || 'Sharing failed.');
        }
      }
    }

    // 2. Web Share API fallback (for mobile web browsers or PWA)
    try {
      const blob = this.base64ToBlob(base64, 'image/jpeg');
      const file = new File([blob], safeFilename, { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          // NO title or text so caption remains empty
        });
        return {
          success: true,
          message: 'Photo shared successfully.',
        };
      } else if (navigator.share) {
        await navigator.share({
          files: [file],
        });
        return {
          success: true,
          message: 'Photo shared successfully.',
        };
      } else {
        // Fallback: Save photo so user has it, and notify
        await this.savePhotoToDevice(photoDataUrl, safeFilename);
        return {
          success: true,
          message: 'Direct sharing unsupported in this browser. Photo downloaded to device.',
        };
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        // User cancelled the share dialog
        return {
          success: true,
          message: 'Share cancelled.',
        };
      }
      console.error('Web share error:', err);
      throw new Error((err as Error)?.message || 'Sharing is not supported on this device.');
    }
  }
}
