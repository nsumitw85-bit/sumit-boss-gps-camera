import { Capacitor, registerPlugin } from '@capacitor/core';
import { Language } from '../types';

interface SumitVoicePluginInterface {
  speak(options: { text: string; lang?: string; volume?: number }): Promise<{ success: boolean; spoken: boolean }>;
  playWelcome(options?: { force?: boolean }): Promise<{ success: boolean; alreadyPlayed: boolean }>;
  stop(): Promise<{ success: boolean }>;
  setEnabled(options: { enabled: boolean; volume?: number }): Promise<{ enabled: boolean; volume: number }>;
  isAvailable(): Promise<{ available: boolean; hasPlayedWelcome: boolean }>;
}

const SumitVoice = registerPlugin<SumitVoicePluginInterface>('SumitVoice');

export class VoiceService {
  private enabled: boolean = true;
  private volume: number = 1.0;
  private synth: SpeechSynthesis | null = null;
  private hasPlayedWelcomeSession: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      // Pre-warm voices on web platforms
      if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
        window.speechSynthesis.onvoiceschanged = () => {
          try {
            this.synth?.getVoices();
          } catch {
            // ignore
          }
        };
      }
    }
  }

  configure(enabled: boolean, volume: number = 1.0) {
    this.enabled = enabled;
    this.volume = volume;

    // Sync state with native Android TextToSpeech engine
    if (Capacitor.isNativePlatform()) {
      try {
        SumitVoice.setEnabled({ enabled, volume }).catch(() => {});
      } catch {
        // ignore
      }
    }
  }

  /**
   * Speak arbitrary text using native Android TextToSpeech when running in APK,
   * with seamless fallback to Web SpeechSynthesis for browser preview.
   */
  async speak(text: string, lang: Language = 'en'): Promise<void> {
    if (!this.enabled) return;

    // 1. Android Native TTS path (Installed APK)
    if (Capacitor.isNativePlatform()) {
      try {
        await SumitVoice.speak({
          text,
          lang: lang === 'hi' ? 'hi' : lang === 'mr' ? 'mr' : 'en',
          volume: this.volume,
        });
        return;
      } catch (err) {
        console.warn('Native TTS speak failed, trying web fallback:', err);
      }
    }

    // 2. Web SpeechSynthesis fallback (Browser / AI Studio preview)
    if (!this.synth) return;

    try {
      this.synth.cancel(); // cancel previous announcement to prevent queuing delays
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = this.volume;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      const voices = this.synth.getVoices();
      let targetLangCode = 'en-US';
      if (lang === 'mr') targetLangCode = 'mr-IN';
      if (lang === 'hi') targetLangCode = 'hi-IN';

      const matchedVoice =
        voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(targetLangCode.toLowerCase())) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('en-'));

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
      utterance.lang = targetLangCode;

      this.synth.speak(utterance);
    } catch {
      // Ignore audio synthesis errors on devices without TTS engine
    }
  }

  /**
   * Play the official English welcome message: "Welcome to Sumit Boss."
   * Guaranteed to play once per app launch session.
   */
  async announceWelcomeOnLaunch(force: boolean = false): Promise<void> {
    if (!this.enabled) return;

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await SumitVoice.playWelcome({ force });
        if (result && result.alreadyPlayed && !force) {
          return;
        }
        this.hasPlayedWelcomeSession = true;
        return;
      } catch (e) {
        console.warn('Native welcome voice failed, attempting web fallback:', e);
      }
    }

    if (this.hasPlayedWelcomeSession && !force) {
      return;
    }

    this.hasPlayedWelcomeSession = true;
    this.speak('Welcome to Sumit Boss.', 'en');
  }

  announceEvent(
    event: 'welcome' | 'camera_opened' | 'gps_acquired' | 'photo_captured' | 'photo_saved' | 'gps_low',
    lang: Language = 'en',
    forceManual: boolean = false
  ) {
    if (event === 'welcome') {
      // The welcome message is explicitly "Welcome to Sumit Boss." in English
      this.announceWelcomeOnLaunch(forceManual);
      return;
    }

    const messages = {
      en: {
        camera_opened: 'Camera opened.',
        gps_acquired: 'GPS location acquired.',
        photo_captured: 'Photo captured successfully.',
        photo_saved: 'Photo saved successfully.',
        gps_low: 'GPS accuracy is low. Move to an open area and try again.',
      },
      mr: {
        camera_opened: 'कॅमेरा उघडला आहे.',
        gps_acquired: 'जीपीएस स्थान प्राप्त झाले.',
        photo_captured: 'फोटो यशस्वीरित्या काढला.',
        photo_saved: 'फोटो यशस्वीरित्या जतन केला.',
        gps_low: 'जीपीएस अचूकता कमी आहे. कृपया खुल्या जागेत जा.',
      },
      hi: {
        camera_opened: 'कैमरा खोला गया।',
        gps_acquired: 'जीपीएस स्थान प्राप्त हुआ।',
        photo_captured: 'फोटो सफलतापूर्वक खींचा गया।',
        photo_saved: 'फोटो सफलतापूर्वक सहेजा गया।',
        gps_low: 'जीपीएस सटीकता कम है। खुले क्षेत्र में जाएं।',
      },
    };

    const dict = messages[lang] || messages.en;
    const text = dict[event as keyof typeof dict];
    if (text) {
      this.speak(text, lang);
    }
  }
}

export const voiceService = new VoiceService();
