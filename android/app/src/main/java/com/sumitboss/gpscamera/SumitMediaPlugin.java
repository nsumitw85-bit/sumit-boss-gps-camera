package com.sumitboss.gpscamera;

import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Typeface;
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
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "SumitMedia")
public class SumitMediaPlugin extends Plugin {

    /**
     * Dedicated Native Android Photo-Stamping Engine
     * Renders high-resolution digital typography, crisp vector icons, and GPS metadata
     * directly onto the full-resolution camera Android Bitmap using native Canvas and Paint.
     */
    @PluginMethod
    public void stampAndSavePhoto(PluginCall call) {
        String base64Data = call.getString("base64");
        String filename = call.getString("filename", "SUMIT_BOSS_" + System.currentTimeMillis() + ".jpg");

        String fullAddressText = call.getString("addressText", "Tivsa, Tehsil Tivsa, Amravati, Maharashtra 444903, India");
        String wardNumber = call.getString("wardNumber", "Ward No. 1");
        String wardName = call.getString("wardName", "Anandwadi & Gaothan North / Morna River Link");
        String gpsCoordsText = call.getString("gpsCoordsText", "21.088000° N, 78.064000° E");
        String pinCodeText = call.getString("pinCodeText", "444903 (Verified)");
        String dateText = call.getString("dateText", "");
        String timeText = call.getString("timeText", "");
        String mapTileBase64 = call.getString("mapTileBase64", null);

        if (base64Data == null || base64Data.trim().isEmpty()) {
            call.reject("Photo data is empty.");
            return;
        }

        try {
            if (base64Data.contains(",")) {
                base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
            }

            byte[] imageBytes = Base64.decode(base64Data, Base64.DEFAULT);

            // Decode into a full-resolution mutable Android Bitmap
            BitmapFactory.Options decodeOptions = new BitmapFactory.Options();
            decodeOptions.inMutable = true;
            decodeOptions.inPreferredConfig = Bitmap.Config.ARGB_8888;
            Bitmap bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length, decodeOptions);

            if (bitmap == null) {
                call.reject("Unable to decode camera image into Android Bitmap.");
                return;
            }

            if (!bitmap.isMutable()) {
                bitmap = bitmap.copy(Bitmap.Config.ARGB_8888, true);
            }

            int photoWidth = bitmap.getWidth();
            int photoHeight = bitmap.getHeight();

            Double latitude = call.getDouble("latitude", 21.088);
            Double longitude = call.getDouble("longitude", 78.064);

            // Decode satellite map tile thumbnail if provided or fetch directly
            Bitmap mapTileBitmap = null;
            if (mapTileBase64 != null && !mapTileBase64.isEmpty()) {
                try {
                    String cleanMapBase64 = mapTileBase64;
                    if (cleanMapBase64.contains(",")) {
                        cleanMapBase64 = cleanMapBase64.substring(cleanMapBase64.indexOf(",") + 1);
                    }
                    byte[] mapBytes = Base64.decode(cleanMapBase64, Base64.DEFAULT);
                    mapTileBitmap = BitmapFactory.decodeByteArray(mapBytes, 0, mapBytes.length);
                } catch (Exception ignored) {}
            }

            if (mapTileBitmap == null && latitude != null && longitude != null) {
                mapTileBitmap = fetchSatelliteMapTile(latitude, longitude);
            }

            // Perform native high-resolution drawing on the camera Bitmap
            Canvas canvas = new Canvas(bitmap);

            renderNativeGpsPanel(
                canvas,
                photoWidth,
                photoHeight,
                fullAddressText,
                wardNumber,
                wardName,
                gpsCoordsText,
                pinCodeText,
                dateText,
                timeText,
                mapTileBitmap
            );

            // Compress to JPEG with 100% Quality (zero compression loss)
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 100, baos);
            byte[] stampedBytes = baos.toByteArray();

            // Save stamped photo directly to Android Gallery via MediaStore
            Context context = getContext();
            String safeFilename = filename.endsWith(".jpg") || filename.endsWith(".jpeg") ? filename : filename + ".jpg";
            String savedUriString = null;
            String savedFilePath = null;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = context.getContentResolver();
                ContentValues contentValues = new ContentValues();
                contentValues.put(MediaStore.Images.Media.DISPLAY_NAME, safeFilename);
                contentValues.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
                contentValues.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + File.separator + "SUMIT BOSS");
                contentValues.put(MediaStore.Images.Media.IS_PENDING, 1);

                Uri collection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                Uri imageUri = resolver.insert(collection, contentValues);

                if (imageUri != null) {
                    try (OutputStream os = resolver.openOutputStream(imageUri)) {
                        if (os != null) {
                            os.write(stampedBytes);
                            os.flush();
                        }
                    }
                    contentValues.clear();
                    contentValues.put(MediaStore.Images.Media.IS_PENDING, 0);
                    resolver.update(imageUri, contentValues, null, null);
                    savedUriString = imageUri.toString();
                }
            } else {
                File picturesDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "SUMIT BOSS");
                if (!picturesDir.exists()) {
                    picturesDir.mkdirs();
                }
                File imageFile = new File(picturesDir, safeFilename);
                try (FileOutputStream fos = new FileOutputStream(imageFile)) {
                    fos.write(stampedBytes);
                    fos.flush();
                }
                MediaScannerConnection.scanFile(
                    context,
                    new String[]{imageFile.getAbsolutePath()},
                    new String[]{"image/jpeg"},
                    null
                );
                savedFilePath = imageFile.getAbsolutePath();
            }

            // Return stamped image base64 back to web layer for live display in UI and Gallery
            String stampedBase64 = "data:image/jpeg;base64," + Base64.encodeToString(stampedBytes, Base64.NO_WRAP);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("stampedDataUrl", stampedBase64);
            ret.put("width", photoWidth);
            ret.put("height", photoHeight);
            if (savedUriString != null) ret.put("uri", savedUriString);
            if (savedFilePath != null) ret.put("filePath", savedFilePath);
            ret.put("message", "Photo stamped with native HD typography and saved to Gallery.");
            call.resolve(ret);

        } catch (Exception e) {
            call.reject("Native stamp execution error: " + e.getMessage(), e);
        }
    }

    /**
     * Renders the complete GPS information panel using native Android Canvas, Paint, and Typeface
     */
    private void renderNativeGpsPanel(
        Canvas canvas,
        int photoWidth,
        int photoHeight,
        String addressText,
        String wardNumber,
        String wardName,
        String gpsCoordsText,
        String pinCodeText,
        String dateText,
        String timeText,
        Bitmap mapTileBitmap
    ) {
        boolean isPortrait = photoHeight > photoWidth;
        float baseTarget = isPortrait ? 1080f : 1600f;
        float scale = Math.max(1.0f, (float) photoWidth / baseTarget);

        float margin = 18f * scale;
        float pad = 18f * scale;
        float boxWidth = (float) photoWidth - margin * 2f;

        float labelSize = 15f * scale;
        float valueSize = 15.5f * scale;
        float iconSize = 18f * scale;

        float mapSize = 180f * scale;

        float rightColX = margin + pad + mapSize + 18f * scale;
        float rightColWidth = boxWidth - (mapSize + pad * 2f + 18f * scale);

        // Paints initialization with full Anti-Aliasing and Subpixel rendering
        Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG | Paint.LINEAR_TEXT_FLAG);
        textPaint.setAntiAlias(true);
        textPaint.setSubpixelText(true);
        textPaint.setDither(true);

        Paint fillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        fillPaint.setAntiAlias(true);
        fillPaint.setStyle(Paint.Style.FILL);

        Paint strokePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        strokePaint.setAntiAlias(true);
        strokePaint.setStyle(Paint.Style.STROKE);

        // Measure text wrapping for full address
        textPaint.setTextSize(valueSize);
        textPaint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
        float addressLabelWidth = 155f * scale;
        float maxAddressTextWidth = Math.max(160f, rightColWidth - (iconSize + addressLabelWidth + 12f * scale));
        List<String> addressLines = wrapTextNative(addressText, textPaint, maxAddressTextWidth);

        float headerHeight = 32f * scale;
        float addressLineHeight = 21f * scale;
        float addressBlockHeight = Math.max(addressLineHeight, addressLines.size() * addressLineHeight);
        float rowHeight = 28f * scale;

        float contentHeight = pad * 2f + headerHeight + addressBlockHeight + rowHeight * 4f + 14f * scale;
        float boxHeight = Math.max(mapSize + pad * 2f, contentHeight);

        float boxX = margin;
        float boxY = (float) photoHeight - boxHeight - margin;

        // 1. Draw Semi-Transparent Dark Navy Rectangular Panel with Rounded Corners
        RectF boxRect = new RectF(boxX, boxY, boxX + boxWidth, boxY + boxHeight);
        fillPaint.setColor(Color.argb(240, 7, 14, 36)); // Deep dark navy #070E24 (94% opacity)
        canvas.drawRoundRect(boxRect, 18f * scale, 18f * scale, fillPaint);

        // Crisp border
        strokePaint.setColor(Color.argb(90, 56, 189, 248)); // Sky blue border
        strokePaint.setStrokeWidth(Math.max(2f, 2f * scale));
        canvas.drawRoundRect(boxRect, 18f * scale, 18f * scale, strokePaint);

        // 2. LEFT COLUMN: Satellite Map Thumbnail
        float mapX = boxX + pad;
        float mapY = boxY + (boxHeight - mapSize) / 2f;
        RectF mapRect = new RectF(mapX, mapY, mapX + mapSize, mapY + mapSize);

        canvas.save();
        Path mapClipPath = new Path();
        mapClipPath.addRoundRect(mapRect, 14f * scale, 14f * scale, Path.Direction.CW);
        canvas.clipPath(mapClipPath);

        if (mapTileBitmap != null) {
            Paint bmpPaint = new Paint(Paint.FILTER_BITMAP_FLAG | Paint.ANTI_ALIAS_FLAG);
            bmpPaint.setFilterBitmap(true);
            RectF srcRect = new RectF(0, 0, mapTileBitmap.getWidth(), mapTileBitmap.getHeight());
            canvas.drawBitmap(mapTileBitmap, null, mapRect, bmpPaint);
        } else {
            // Dark satellite grid fallback
            fillPaint.setColor(Color.rgb(11, 19, 41));
            canvas.drawRect(mapRect, fillPaint);
            strokePaint.setColor(Color.argb(60, 56, 189, 248));
            strokePaint.setStrokeWidth(1f);
            float step = 24f * scale;
            for (float gx = mapX; gx < mapX + mapSize; gx += step) {
                canvas.drawLine(gx, mapY, gx, mapY + mapSize, strokePaint);
            }
            for (float gy = mapY; gy < mapY + mapSize; gy += step) {
                canvas.drawLine(mapX, gy, mapX + mapSize, gy, strokePaint);
            }
        }
        canvas.restore();

        // Border around map thumbnail
        strokePaint.setColor(Color.argb(100, 255, 255, 255));
        strokePaint.setStrokeWidth(Math.max(1.5f, 1.5f * scale));
        canvas.drawRoundRect(mapRect, 14f * scale, 14f * scale, strokePaint);

        // Centered Red Location Pin on Map Thumbnail
        drawNativeGpsPin(canvas, mapX + mapSize / 2f, mapY + mapSize / 2f, 26f * scale);

        // Map Corner Badge: SATELLITE
        RectF badgeRect = new RectF(mapX + 8f * scale, mapY + 8f * scale, mapX + 70f * scale, mapY + 28f * scale);
        fillPaint.setColor(Color.argb(220, 0, 0, 0));
        canvas.drawRoundRect(badgeRect, 5f * scale, 5f * scale, fillPaint);

        textPaint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
        textPaint.setTextSize(10f * scale);
        textPaint.setColor(Color.rgb(56, 189, 248));
        canvas.drawText("SATELLITE", mapX + 13f * scale, mapY + 22f * scale, textPaint);

        // 3. RIGHT COLUMN: GPS DETAILS
        float currentY = boxY + pad + 20f * scale;

        // Configure text drop shadow for maximum contrast and legibility
        textPaint.setShadowLayer(3f * scale, 1f * scale, 1f * scale, Color.argb(220, 0, 0, 0));

        // Header: SUMIT BOSS
        textPaint.setTextSize(20f * scale);
        textPaint.setColor(Color.WHITE);
        textPaint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
        canvas.drawText("SUMIT BOSS", rightColX, currentY, textPaint);

        float brandWidth = textPaint.measureText("SUMIT BOSS");
        float proBadgeX = rightColX + brandWidth + 10f * scale;
        float proBadgeW = 68f * scale;
        float proBadgeH = 20f * scale;
        float proBadgeY = currentY - 15f * scale;

        // PRO GPS Badge box
        textPaint.clearShadowLayer();
        fillPaint.setColor(Color.argb(50, 56, 189, 248));
        RectF proBadgeRect = new RectF(proBadgeX, proBadgeY, proBadgeX + proBadgeW, proBadgeY + proBadgeH);
        canvas.drawRoundRect(proBadgeRect, 4f * scale, 4f * scale, fillPaint);

        strokePaint.setColor(Color.rgb(56, 189, 248));
        strokePaint.setStrokeWidth(Math.max(1f, 1.2f * scale));
        canvas.drawRoundRect(proBadgeRect, 4f * scale, 4f * scale, strokePaint);

        textPaint.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
        textPaint.setTextSize(11f * scale);
        textPaint.setColor(Color.rgb(56, 189, 248));
        canvas.drawText("PRO GPS", proBadgeX + 8f * scale, currentY - 1f * scale, textPaint);

        textPaint.setShadowLayer(3f * scale, 1f * scale, 1f * scale, Color.argb(220, 0, 0, 0));
        textPaint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
        textPaint.setTextSize(12f * scale);
        textPaint.setColor(Color.rgb(203, 213, 225)); // Slate-300
        canvas.drawText("• GPS Camera • Tivsa Nagar Panchayat", proBadgeX + proBadgeW + 10f * scale, currentY - 1f * scale, textPaint);

        currentY += 20f * scale;

        // Horizontal divider
        textPaint.clearShadowLayer();
        strokePaint.setColor(Color.argb(40, 255, 255, 255));
        strokePaint.setStrokeWidth(1f);
        canvas.drawLine(rightColX, currentY, boxX + boxWidth - pad, currentY, strokePaint);

        currentY += 20f * scale;
        textPaint.setShadowLayer(3f * scale, 1f * scale, 1f * scale, Color.argb(220, 0, 0, 0));

        float iconCenterX = rightColX + iconSize / 2f;
        float textX = rightColX + iconSize + 10f * scale;

        // Row 1: Vector Pin + GPS LOCATION:
        drawNativeGpsPin(canvas, iconCenterX, currentY - iconSize * 0.35f, iconSize);

        textPaint.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
        textPaint.setTextSize(labelSize);
        textPaint.setColor(Color.rgb(56, 189, 248)); // Sky-400
        canvas.drawText("GPS LOCATION: ", textX, currentY, textPaint);

        float locLabelW = textPaint.measureText("GPS LOCATION: ");
        textPaint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
        textPaint.setTextSize(valueSize);
        textPaint.setColor(Color.WHITE);

        if (!addressLines.isEmpty()) {
            canvas.drawText(addressLines.get(0), textX + locLabelW, currentY, textPaint);
            for (int i = 1; i < addressLines.size(); i++) {
                currentY += addressLineHeight;
                canvas.drawText(addressLines.get(i), textX, currentY, textPaint);
            }
        }
        currentY += rowHeight;

        // Row 2: Vector Building + WARD NO:
        drawNativeBuilding(canvas, iconCenterX, currentY - iconSize * 0.35f, iconSize);

        textPaint.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
        textPaint.setTextSize(labelSize);
        textPaint.setColor(Color.rgb(251, 191, 36)); // Amber-400
        canvas.drawText("WARD NO: ", textX, currentY, textPaint);

        float wardLabelW = textPaint.measureText("WARD NO: ");
        textPaint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
        textPaint.setTextSize(valueSize);

        String wardFullStr = wardNumber;
        if (wardName != null && !wardName.isEmpty() && !wardNumber.contains("Not Verified") && !wardNumber.contains("Outside")) {
            wardFullStr += " • " + wardName;
        }

        if (wardFullStr.contains("Not Verified") || wardFullStr.contains("Outside") || wardFullStr.contains("Required")) {
            textPaint.setColor(Color.rgb(248, 113, 113)); // Red-400
        } else {
            textPaint.setColor(Color.rgb(254, 240, 138)); // Bright Yellow
        }
        canvas.drawText(wardFullStr, textX + wardLabelW, currentY, textPaint);

        currentY += rowHeight;

        // Row 3: Vector Globe + GPS:
        drawNativeGlobe(canvas, iconCenterX, currentY - iconSize * 0.35f, iconSize);

        textPaint.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
        textPaint.setTextSize(labelSize);
        textPaint.setColor(Color.rgb(45, 212, 191)); // Teal-400
        canvas.drawText("GPS: ", textX, currentY, textPaint);

        float gpsLabelW = textPaint.measureText("GPS: ");
        textPaint.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
        textPaint.setTextSize(valueSize);
        textPaint.setColor(Color.WHITE);
        canvas.drawText(gpsCoordsText, textX + gpsLabelW, currentY, textPaint);

        currentY += rowHeight;

        // Row 4: Vector Mailbox + PIN CODE:
        drawNativePinCode(canvas, iconCenterX, currentY - iconSize * 0.35f, iconSize);

        textPaint.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
        textPaint.setTextSize(labelSize);
        textPaint.setColor(Color.rgb(244, 114, 182)); // Pink-400
        canvas.drawText("PIN CODE: ", textX, currentY, textPaint);

        float pinLabelW = textPaint.measureText("PIN CODE: ");
        textPaint.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
        textPaint.setTextSize(valueSize);
        textPaint.setColor(Color.WHITE);
        canvas.drawText(pinCodeText, textX + pinLabelW, currentY, textPaint);

        currentY += rowHeight;

        // Row 5: Vector Calendar + DATE: & Vector Clock + TIME:
        drawNativeCalendar(canvas, iconCenterX, currentY - iconSize * 0.35f, iconSize);

        textPaint.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
        textPaint.setTextSize(labelSize);
        textPaint.setColor(Color.rgb(251, 146, 60)); // Orange-400
        canvas.drawText("DATE: ", textX, currentY, textPaint);

        float dateLabelW = textPaint.measureText("DATE: ");
        textPaint.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
        textPaint.setTextSize(valueSize);
        textPaint.setColor(Color.WHITE);
        canvas.drawText(dateText, textX + dateLabelW, currentY, textPaint);

        float dateValW = textPaint.measureText(dateText);
        float timeStartX = textX + dateLabelW + dateValW + 24f * scale;

        drawNativeClock(canvas, timeStartX + iconSize / 2f, currentY - iconSize * 0.35f, iconSize);

        textPaint.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
        textPaint.setTextSize(labelSize);
        textPaint.setColor(Color.rgb(74, 222, 128)); // Emerald-400
        canvas.drawText("TIME: ", timeStartX + iconSize + 10f * scale, currentY, textPaint);

        float timeLabelW = textPaint.measureText("TIME: ");
        textPaint.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
        textPaint.setTextSize(valueSize);
        textPaint.setColor(Color.WHITE);
        canvas.drawText(timeText, timeStartX + iconSize + 10f * scale + timeLabelW, currentY, textPaint);
    }

    /**
     * Vector GPS Pin Icon
     */
    private void drawNativeGpsPin(Canvas canvas, float x, float y, float size) {
        canvas.save();
        canvas.translate(x, y);
        float r = size * 0.42f;

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(Color.rgb(239, 68, 68)); // Red-500

        canvas.drawCircle(0, -size * 0.28f, r, paint);

        Path path = new Path();
        path.moveTo(-r * 0.88f, -size * 0.2f);
        path.lineTo(0, size * 0.48f);
        path.lineTo(r * 0.88f, -size * 0.2f);
        path.close();
        canvas.drawPath(path, paint);

        paint.setColor(Color.WHITE);
        canvas.drawCircle(0, -size * 0.28f, r * 0.45f, paint);

        canvas.restore();
    }

    /**
     * Vector Municipal Building / Ward Icon
     */
    private void drawNativeBuilding(Canvas canvas, float x, float y, float size) {
        canvas.save();
        canvas.translate(x, y);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(Color.rgb(251, 191, 36)); // Amber-400

        float w = size * 0.85f;
        float h = size * 0.85f;
        float top = -h / 2f;

        Path roof = new Path();
        roof.moveTo(-w / 2f - size * 0.05f, top + size * 0.25f);
        roof.lineTo(0, top);
        roof.lineTo(w / 2f + size * 0.05f, top + size * 0.25f);
        roof.close();
        canvas.drawPath(roof, paint);

        canvas.drawRect(-w / 2f, top + size * 0.25f, w / 2f, top + h, paint);

        // Windows
        paint.setColor(Color.rgb(15, 23, 42));
        float winW = size * 0.16f;
        float winH = size * 0.16f;
        canvas.drawRect(-w * 0.35f, top + size * 0.35f, -w * 0.35f + winW, top + size * 0.35f + winH, paint);
        canvas.drawRect(w * 0.35f - winW, top + size * 0.35f, w * 0.35f, top + size * 0.35f + winH, paint);
        canvas.drawRect(-w * 0.35f, top + size * 0.58f, -w * 0.35f + winW, top + size * 0.58f + winH, paint);
        canvas.drawRect(w * 0.35f - winW, top + size * 0.58f, w * 0.35f, top + size * 0.58f + winH, paint);

        // Door
        paint.setColor(Color.WHITE);
        canvas.drawRect(-size * 0.11f, top + h - size * 0.25f, size * 0.11f, top + h, paint);

        canvas.restore();
    }

    /**
     * Vector Globe Icon
     */
    private void drawNativeGlobe(Canvas canvas, float x, float y, float size) {
        canvas.save();
        canvas.translate(x, y);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setStyle(Paint.Style.STROKE);
        paint.setColor(Color.rgb(45, 212, 191)); // Teal-400
        paint.setStrokeWidth(Math.max(1.8f, size * 0.12f));

        float r = size * 0.44f;
        canvas.drawCircle(0, 0, r, paint);
        canvas.drawLine(-r, 0, r, 0, paint);

        RectF oval = new RectF(-r * 0.48f, -r, r * 0.48f, r);
        canvas.drawOval(oval, paint);

        canvas.restore();
    }

    /**
     * Vector PIN Mailbox Icon
     */
    private void drawNativePinCode(Canvas canvas, float x, float y, float size) {
        canvas.save();
        canvas.translate(x, y);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(Color.rgb(244, 114, 182)); // Pink-400

        float w = size * 0.9f;
        float h = size * 0.65f;
        RectF envelope = new RectF(-w / 2f, -h / 2f, w / 2f, h / 2f);
        canvas.drawRoundRect(envelope, size * 0.08f, size * 0.08f, paint);

        paint.setStyle(Paint.Style.STROKE);
        paint.setColor(Color.WHITE);
        paint.setStrokeWidth(Math.max(1.6f, size * 0.1f));
        paint.setStrokeCap(Paint.Cap.ROUND);
        paint.setStrokeJoin(Paint.Join.ROUND);

        Path flap = new Path();
        flap.moveTo(-w / 2f, -h / 2f);
        flap.lineTo(0, size * 0.08f);
        flap.lineTo(w / 2f, -h / 2f);
        canvas.drawPath(flap, paint);

        canvas.restore();
    }

    /**
     * Vector Calendar Date Icon
     */
    private void drawNativeCalendar(Canvas canvas, float x, float y, float size) {
        canvas.save();
        canvas.translate(x, y);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(Color.WHITE);

        float w = size * 0.85f;
        float h = size * 0.85f;
        RectF calRect = new RectF(-w / 2f, -h / 2f, w / 2f, h / 2f);
        canvas.drawRoundRect(calRect, size * 0.1f, size * 0.1f, paint);

        paint.setColor(Color.rgb(251, 146, 60)); // Orange-400
        RectF headerRect = new RectF(-w / 2f, -h / 2f, w / 2f, -h / 2f + h * 0.35f);
        canvas.drawRoundRect(headerRect, size * 0.1f, size * 0.1f, paint);

        paint.setColor(Color.rgb(30, 41, 59));
        float ringW = size * 0.09f;
        float ringH = size * 0.18f;
        canvas.drawRect(-w * 0.28f, -h / 2f - size * 0.06f, -w * 0.28f + ringW, -h / 2f - size * 0.06f + ringH, paint);
        canvas.drawRect(w * 0.28f - ringW, -h / 2f - size * 0.06f, w * 0.28f, -h / 2f - size * 0.06f + ringH, paint);

        paint.setColor(Color.rgb(148, 163, 184));
        float dotR = size * 0.05f;
        float yDot = size * 0.14f;
        canvas.drawCircle(-w * 0.22f, yDot, dotR, paint);
        canvas.drawCircle(0, yDot, dotR, paint);
        canvas.drawCircle(w * 0.22f, yDot, dotR, paint);

        canvas.restore();
    }

    /**
     * Vector Clock Time Icon
     */
    private void drawNativeClock(Canvas canvas, float x, float y, float size) {
        canvas.save();
        canvas.translate(x, y);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(Color.rgb(74, 222, 128)); // Emerald-400

        float r = size * 0.44f;
        canvas.drawCircle(0, 0, r, paint);

        paint.setStyle(Paint.Style.STROKE);
        paint.setColor(Color.WHITE);
        paint.setStrokeWidth(Math.max(1.8f, size * 0.12f));
        paint.setStrokeCap(Paint.Cap.ROUND);

        canvas.drawLine(0, 0, 0, -r * 0.6f, paint);
        canvas.drawLine(0, 0, r * 0.52f, 0, paint);

        paint.setStyle(Paint.Style.FILL);
        canvas.drawCircle(0, 0, size * 0.08f, paint);

        canvas.restore();
    }

    /**
     * Wraps text into lines that fit maxWidth using native Paint measurement
     */
    private List<String> wrapTextNative(String text, Paint paint, float maxWidth) {
        List<String> lines = new ArrayList<>();
        if (text == null || text.isEmpty()) return lines;

        String[] words = text.split(" ");
        StringBuilder currentLine = new StringBuilder();

        for (String word : words) {
            String test = currentLine.length() == 0 ? word : currentLine + " " + word;
            if (paint.measureText(test) > maxWidth && currentLine.length() > 0) {
                lines.add(currentLine.toString());
                currentLine = new StringBuilder(word);
            } else {
                currentLine = new StringBuilder(test);
            }
        }
        if (currentLine.length() > 0) {
            lines.add(currentLine.toString());
        }
        return lines;
    }

    /**
     * Directly fetch high-resolution satellite map tile via native HTTP
     */
    private Bitmap fetchSatelliteMapTile(double lat, double lng) {
        try {
            int zoom = 17;
            double n = Math.pow(2, zoom);
            int tileX = (int) Math.floor(((lng + 180) / 360) * n);
            double latRad = (lat * Math.PI) / 180;
            int tileY = (int) Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);

            String urlString = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/" + zoom + "/" + tileY + "/" + tileX;
            java.net.URL url = new java.net.URL(urlString);
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(2500);
            conn.setReadTimeout(2500);
            conn.setDoInput(true);
            conn.connect();
            if (conn.getResponseCode() == 200) {
                java.io.InputStream is = conn.getInputStream();
                return BitmapFactory.decodeStream(is);
            }
        } catch (Exception ignored) {}
        return null;
    }

    @PluginMethod
    public void savePhotoToGallery(PluginCall call) {
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

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
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

            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("image/jpeg");
            intent.putExtra(Intent.EXTRA_STREAM, photoUri);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            PackageManager pm = context.getPackageManager();
            boolean isWhatsAppInstalled = false;
            String targetPackage = null;

            try {
                pm.getPackageInfo("com.whatsapp", PackageManager.GET_ACTIVITIES);
                isWhatsAppInstalled = true;
                targetPackage = "com.whatsapp";
            } catch (PackageManager.NameNotFoundException ignored) {
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
                    intent.setPackage(null);
                    Intent chooser = Intent.createChooser(intent, "Share Photo via WhatsApp");
                    getActivity().startActivity(chooser);
                }
            } else {
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
