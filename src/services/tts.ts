import { Language } from '../types';

export class VoiceService {
  private enabled: boolean = true;
  private volume: number = 1.0;
  private synth: SpeechSynthesis | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  configure(enabled: boolean, volume: number = 1.0) {
    this.enabled = enabled;
    this.volume = volume;
  }

  speak(text: string, lang: Language = 'en') {
    if (!this.enabled || !this.synth) return;

    try {
      this.synth.cancel(); // cancel previous announcement to avoid queuing long speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = this.volume;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select appropriate voice based on language
      const voices = this.synth.getVoices();
      let targetLangCode = 'en-IN';
      if (lang === 'mr') targetLangCode = 'mr-IN';
      if (lang === 'hi') targetLangCode = 'hi-IN';

      const matchedVoice = voices.find((v) => v.lang.toLowerCase().startsWith(targetLangCode.toLowerCase())) ||
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

  announceEvent(event: 'welcome' | 'camera_opened' | 'gps_acquired' | 'photo_captured' | 'photo_saved' | 'gps_low', lang: Language = 'en') {
    const messages = {
      en: {
        welcome: 'Welcome to Sumit Boss.',
        camera_opened: 'Camera opened.',
        gps_acquired: 'GPS location acquired.',
        photo_captured: 'Photo captured successfully.',
        photo_saved: 'Photo saved successfully.',
        gps_low: 'GPS accuracy is low. Move to an open area and try again.',
      },
      mr: {
        welcome: 'सुमित बॉस मध्ये आपले स्वागत आहे.',
        camera_opened: 'कॅमेरा उघडला आहे.',
        gps_acquired: 'जीपीएस स्थान प्राप्त झाले.',
        photo_captured: 'फोटो यशस्वीरित्या काढला.',
        photo_saved: 'फोटो यशस्वीरित्या जतन केला.',
        gps_low: 'जीपीएस अचूकता कमी आहे. कृपया खुल्या जागेत जा.',
      },
      hi: {
        welcome: 'सुमित बॉस में आपका स्वागत है।',
        camera_opened: 'कैमरा खोला गया।',
        gps_acquired: 'जीपीएस स्थान प्राप्त हुआ।',
        photo_captured: 'फोटो सफलतापूर्वक खींचा गया।',
        photo_saved: 'फोटो सफलतापूर्वक सहेजा गया।',
        gps_low: 'जीपीएस सटीकता कम है। खुले क्षेत्र में जाएं।',
      },
    };

    const dict = messages[lang] || messages.en;
    const text = dict[event];
    if (text) {
      this.speak(text, lang);
    }
  }
}

export const voiceService = new VoiceService();
