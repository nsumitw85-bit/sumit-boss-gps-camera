package com.sumitboss.gpscamera;

import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "SumitMedia")
public class SumitMediaPlugin extends Plugin {

    @PluginMethod
    public void savePhotoToGallery(PluginCall call) {
        String base64Data = call.getString("base64");
        String filename = call.getString("filename", "SUMIT_BOSS_" + System.currentTimeMillis() + ".jpg");

        if (base64Data == null || base64Data.trim().isEmpty()) {
            call.reject("Photo data is empty.");
            return;
        }

        try {
            // Strip data URL header if present (e.g., data:image/jpeg;base64,...)
            if (base64Data.contains(",")) {
                base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
            }

            byte[] imageBytes = Base64.decode(base64Data, Base64.DEFAULT);
            Context context = getContext();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ (API 29+): Use MediaStore with relative path in Pictures/SUMIT BOSS
                ContentResolver resolver = context.getContentResolver();
                ContentValues contentValues = new ContentValues();
                contentValues.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
                contentValues.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
                contentValues.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + File.separator + "SUMIT BOSS");
                contentValues.put(MediaStore.Images.Media.IS_PENDING, 1);

                Uri collection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                Uri imageUri = resolver.insert(collection, contentValues);

                if (imageUri == null) {
                    call.reject("Could not create MediaStore entry for saving photo.");
                    return;
                }

                try (OutputStream os = resolver.openOutputStream(imageUri)) {
                    if (os == null) {
                        call.reject("Failed to open output stream for gallery.");
                        return;
                    }
                    os.write(imageBytes);
                    os.flush();
                }

                contentValues.clear();
                contentValues.put(MediaStore.Images.Media.IS_PENDING, 0);
                resolver.update(imageUri, contentValues, null, null);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("uri", imageUri.toString());
                ret.put("message", "Photo saved successfully to Gallery.");
                call.resolve(ret);
            } else {
                // Android 9 and lower: write directly to external Pictures/SUMIT BOSS and scan
                File picturesDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "SUMIT BOSS");
                if (!picturesDir.exists()) {
                    picturesDir.mkdirs();
                }
                File imageFile = new File(picturesDir, filename);
                try (FileOutputStream fos = new FileOutputStream(imageFile)) {
                    fos.write(imageBytes);
                    fos.flush();
                }

                MediaScannerConnection.scanFile(
                    context,
                    new String[]{imageFile.getAbsolutePath()},
                    new String[]{"image/jpeg"},
                    null
                );

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("filePath", imageFile.getAbsolutePath());
                ret.put("message", "Photo saved successfully to Gallery.");
                call.resolve(ret);
            }
        } catch (Exception e) {
            call.reject("Error saving photo: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void shareToWhatsApp(PluginCall call) {
        String base64Data = call.getString("base64");
        String filename = call.getString("filename", "SUMIT_BOSS_" + System.currentTimeMillis() + ".jpg");

        if (base64Data == null || base64Data.trim().isEmpty()) {
            call.reject("Photo data is empty.");
            return;
        }

        try {
            if (base64Data.contains(",")) {
                base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
            }

            byte[] imageBytes = Base64.decode(base64Data, Base64.DEFAULT);
            Context context = getContext();

            // Save image temporarily to app cache so FileProvider can grant access to WhatsApp
            File cacheFolder = new File(context.getCacheDir(), "shared_photos");
            if (!cacheFolder.exists()) {
                cacheFolder.mkdirs();
            }

            File photoFile = new File(cacheFolder, filename);
            try (FileOutputStream fos = new FileOutputStream(photoFile)) {
                fos.write(imageBytes);
                fos.flush();
            }

            Uri photoUri = FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                photoFile
            );

            // Construct sharing intent with IMAGE ONLY - no text or caption
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("image/jpeg");
            intent.putExtra(Intent.EXTRA_STREAM, photoUri);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            // DO NOT set Intent.EXTRA_TEXT - caption should be completely empty

            PackageManager pm = context.getPackageManager();
            boolean isWhatsAppInstalled = false;
            String targetPackage = null;

            // Check standard WhatsApp first
            try {
                pm.getPackageInfo("com.whatsapp", PackageManager.GET_ACTIVITIES);
                isWhatsAppInstalled = true;
                targetPackage = "com.whatsapp";
            } catch (PackageManager.NameNotFoundException ignored) {
                // Check WhatsApp Business
                try {
                    pm.getPackageInfo("com.whatsapp.w4b", PackageManager.GET_ACTIVITIES);
                    isWhatsAppInstalled = true;
                    targetPackage = "com.whatsapp.w4b";
                } catch (PackageManager.NameNotFoundException ignored2) {
                    isWhatsAppInstalled = false;
                }
            }

            if (isWhatsAppInstalled && targetPackage != null) {
                try {
                    intent.setPackage(targetPackage);
                    getActivity().startActivity(intent);
                } catch (ActivityNotFoundException ex) {
                    // Fall back to system chooser with image
                    intent.setPackage(null);
                    Intent chooser = Intent.createChooser(intent, "Share Photo via WhatsApp");
                    getActivity().startActivity(chooser);
                }
            } else {
                // WhatsApp not installed: open system share sheet
                intent.setPackage(null);
                Intent chooser = Intent.createChooser(intent, "Share Photo");
                getActivity().startActivity(chooser);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("isWhatsAppInstalled", isWhatsAppInstalled);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error sharing photo: " + e.getMessage(), e);
        }
    }
}
