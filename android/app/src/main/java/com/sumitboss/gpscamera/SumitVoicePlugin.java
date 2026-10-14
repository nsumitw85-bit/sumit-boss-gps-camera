package com.sumitboss.gpscamera;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashMap;
import java.util.Locale;

@CapacitorPlugin(name = "SumitVoice")
public class SumitVoicePlugin extends Plugin implements TextToSpeech.OnInitListener {

    private static final String TAG = "SumitVoicePlugin";
    private static final String WELCOME_MESSAGE = "Welcome to Sumit Boss.";

    private static TextToSpeech tts;
    private static boolean isInitialized = false;
    private static boolean isInitializing = false;
    private static boolean hasPlayedWelcomeThisSession = false;
    private static boolean pendingWelcome = false;
    private static boolean voiceEnabled = true;
    private static float voiceVolume = 1.0f;
    private static Context appContext;

    @Override
    public void load() {
        super.load();
        appContext = getContext().getApplicationContext();
        initTtsIfNeeded(appContext, false);
    }

    /**
     * Called directly from MainActivity.onCreate() to trigger welcome voice
     * on cold start without requiring user touch or waiting for WebView.
     */
    public static void startWelcomeVoice(Context context) {
        if (context != null) {
            appContext = context.getApplicationContext();
        }
        if (hasPlayedWelcomeThisSession) {
            Log.d(TAG, "Welcome voice already played this session. Skipping duplicate.");
            return;
        }

        pendingWelcome = true;
        initTtsIfNeeded(appContext, true);
    }

    private static synchronized void initTtsIfNeeded(Context context, boolean fromLaunch) {
        if (isInitialized && tts != null) {
            if (pendingWelcome && !hasPlayedWelcomeThisSession) {
                scheduleWelcomeSpeech();
            }
            return;
        }

        if (isInitializing) {
            Log.d(TAG, "TTS initialization already in progress...");
            return;
        }

        if (context == null) {
            Log.e(TAG, "Context is null, cannot initialize TextToSpeech.");
            return;
        }

        isInitializing = true;
        try {
            Log.d(TAG, "Initializing Android TextToSpeech engine...");
            SumitVoicePlugin listener = new SumitVoicePlugin();
            tts = new TextToSpeech(context, listener);
        } catch (Exception e) {
            Log.e(TAG, "Error initializing TextToSpeech: " + e.getMessage(), e);
            isInitializing = false;
        }
    }

    @Override
    public void onInit(int status) {
        isInitializing = false;
        if (status == TextToSpeech.SUCCESS && tts != null) {
            Log.d(TAG, "TextToSpeech engine initialized successfully.");

            // 1. Configure English Language
            Locale targetLocale = Locale.US;
            int langResult = tts.isLanguageAvailable(targetLocale);
            if (langResult == TextToSpeech.LANG_MISSING_DATA || langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                targetLocale = Locale.ENGLISH;
                langResult = tts.isLanguageAvailable(targetLocale);
            }
            if (langResult != TextToSpeech.LANG_MISSING_DATA && langResult != TextToSpeech.LANG_NOT_SUPPORTED) {
                tts.setLanguage(targetLocale);
            } else {
                tts.setLanguage(Locale.getDefault());
            }

            // 2. Configure natural speech attributes
            tts.setSpeechRate(0.95f); // clear, intelligible natural pacing
            tts.setPitch(1.0f);

            // 3. Configure Android AudioAttributes
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build();
                tts.setAudioAttributes(audioAttributes);
            }

            isInitialized = true;

            // 4. If welcome is pending, schedule playback with natural smooth delay
            if (pendingWelcome && !hasPlayedWelcomeThisSession) {
                scheduleWelcomeSpeech();
            }
        } else {
            Log.e(TAG, "TextToSpeech initialization failed with status: " + status);
            isInitialized = false;
        }
    }

    private static void scheduleWelcomeSpeech() {
        if (!voiceEnabled) {
            Log.d(TAG, "Voice announcements disabled in settings. Skipping welcome.");
            pendingWelcome = false;
            return;
        }

        // Natural pacing delay (500ms) to ensure activity window is visible and audio output is ready
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                if (hasPlayedWelcomeThisSession || tts == null || !isInitialized) {
                    return;
                }
                hasPlayedWelcomeThisSession = true;
                pendingWelcome = false;
                Log.d(TAG, "Speaking automatic welcome message: " + WELCOME_MESSAGE);
                speakInternal(WELCOME_MESSAGE, "en", "welcome_init");
            }
        }, 500);
    }

    private static synchronized void speakInternal(String text, String langCode, String utteranceId) {
        if (tts == null || !isInitialized || !voiceEnabled) {
            return;
        }

        try {
            // Apply language if specified
            if (langCode != null) {
                Locale loc = Locale.ENGLISH;
                if ("hi".equalsIgnoreCase(langCode)) {
                    loc = new Locale("hi", "IN");
                } else if ("mr".equalsIgnoreCase(langCode)) {
                    loc = new Locale("mr", "IN");
                }
                if (tts.isLanguageAvailable(loc) >= TextToSpeech.LANG_AVAILABLE) {
                    tts.setLanguage(loc);
                } else {
                    tts.setLanguage(Locale.ENGLISH);
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                Bundle params = new Bundle();
                params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, voiceVolume);
                params.putInt(TextToSpeech.Engine.KEY_PARAM_STREAM, AudioManager.STREAM_MUSIC);
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, utteranceId);
            } else {
                HashMap<String, String> params = new HashMap<>();
                params.put(TextToSpeech.Engine.KEY_PARAM_VOLUME, String.valueOf(voiceVolume));
                params.put(TextToSpeech.Engine.KEY_PARAM_STREAM, String.valueOf(AudioManager.STREAM_MUSIC));
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, params);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error executing speakInternal: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text");
        String lang = call.getString("lang", "en");
        Double vol = call.getDouble("volume");

        if (vol != null) {
            voiceVolume = vol.floatValue();
        }

        if (text == null || text.trim().isEmpty()) {
            call.reject("Speech text cannot be empty.");
            return;
        }

        if (!voiceEnabled) {
            JSObject ret = new JSObject();
            ret.put("spoken", false);
            ret.put("reason", "muted");
            call.resolve(ret);
            return;
        }

        if (!isInitialized || tts == null) {
            initTtsIfNeeded(getContext(), false);
        }

        speakInternal(text, lang, "plugin_speak_" + System.currentTimeMillis());

        JSObject res = new JSObject();
        res.put("success", true);
        res.put("spoken", true);
        call.resolve(res);
    }

    @PluginMethod
    public void playWelcome(PluginCall call) {
        boolean force = Boolean.TRUE.equals(call.getBoolean("force", false));
        if (hasPlayedWelcomeThisSession && !force) {
            JSObject res = new JSObject();
            res.put("success", true);
            res.put("alreadyPlayed", true);
            call.resolve(res);
            return;
        }

        hasPlayedWelcomeThisSession = true;
        speakInternal(WELCOME_MESSAGE, "en", "welcome_manual");

        JSObject res = new JSObject();
        res.put("success", true);
        res.put("alreadyPlayed", false);
        call.resolve(res);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            if (tts != null) {
                tts.stop();
            }
        } catch (Exception ignored) {}
        JSObject res = new JSObject();
        res.put("success", true);
        call.resolve(res);
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled != null) {
            voiceEnabled = enabled;
        }
        Double vol = call.getDouble("volume");
        if (vol != null) {
            voiceVolume = vol.floatValue();
        }
        JSObject res = new JSObject();
        res.put("enabled", voiceEnabled);
        res.put("volume", voiceVolume);
        call.resolve(res);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject res = new JSObject();
        res.put("available", isInitialized && tts != null);
        res.put("hasPlayedWelcome", hasPlayedWelcomeThisSession);
        call.resolve(res);
    }

    public static synchronized void cleanup() {
        try {
            if (tts != null) {
                tts.stop();
                tts.shutdown();
                tts = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error cleaning up TextToSpeech: " + e.getMessage());
        }
        isInitialized = false;
        isInitializing = false;
    }
}
