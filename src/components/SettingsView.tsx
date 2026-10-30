import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Globe,
  Volume2,
  VolumeX,
  Crosshair,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Building2,
  ShieldCheck,
  Save,
  RotateCcw,
  Sparkles,
  Camera,
  Play,
} from 'lucide-react';
import { AppSettings, Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { dbService } from '../services/db';
import { voiceService } from '../services/tts';
import { wardBoundaryService, TIVSA_17_WARDS } from '../services/wardBoundaryService';

interface SettingsViewProps {
  language: Language;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onBack: () => void;
  onNavigate?: (screen: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  language,
  settings,
  onSaveSettings,
  onBack,
  onNavigate,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [geoJsonInput, setGeoJsonInput] = useState<string>('');
  const [showGeoJsonModal, setShowGeoJsonModal] = useState<boolean>(false);
  const [wardListExpanded, setWardListExpanded] = useState<boolean>(false);

  const [importValidation, setImportValidation] = useState<{
    count?: number;
    warnings?: string[];
    missingWards?: number[];
    isWgs84?: boolean;
  } | null>(null);

  const activeDataset = wardBoundaryService.getDataset();

  const handleLanguageChange = async (newLang: Language) => {
    const updated = { ...localSettings, language: newLang };
    setLocalSettings(updated);
    await dbService.saveSettings(updated);
    onSaveSettings(updated);
    setSuccessMsg('Language updated');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleToggleSound = async () => {
    const nextState = !localSettings.voiceAnnouncements;
    const updated = { ...localSettings, voiceAnnouncements: nextState };
    setLocalSettings(updated);
    await dbService.saveSettings(updated);
    onSaveSettings(updated);
    voiceService.configure(nextState, updated.speechVolume);
    setSuccessMsg(nextState ? 'Voice announcements enabled' : 'Voice announcements muted');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleTestWelcomeVoice = async () => {
    try {
      await voiceService.announceWelcomeOnLaunch(true);
      setSuccessMsg('Playing "Welcome to Sumit Boss."');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg('Voice error: ' + err.message);
    }
  };

  const handleSave = async () => {
    await dbService.saveSettings(localSettings);
    onSaveSettings(localSettings);
    voiceService.configure(localSettings.voiceAnnouncements, localSettings.speechVolume);
    setSuccessMsg('Settings saved successfully.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleExportGeoJson = () => {
    const geoJsonStr = wardBoundaryService.exportGeoJson();
    const blob = new Blob([geoJsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tivsa_Nagar_Panchayat_17_Wards_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSuccessMsg('Tivsa 17-Ward GeoJSON exported successfully.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setGeoJsonInput(text);
      }
    };
    reader.readAsText(file);
  };

  const handleImportGeoJsonSubmit = () => {
    if (!geoJsonInput.trim()) {
      setErrorMsg('Please paste or upload valid GeoJSON or KML content.');
      return;
    }
    const result = wardBoundaryService.importGeoJsonOrKml(geoJsonInput, 'Tivsa Nagar Panchayat');
    if (result.success) {
      setSuccessMsg(result.message);
      if (result.warnings && result.warnings.length > 0) {
        setImportValidation({ warnings: result.warnings, count: result.count });
      } else {
        setShowGeoJsonModal(false);
        setGeoJsonInput('');
        setImportValidation(null);
      }
      setTimeout(() => setSuccessMsg(null), 3500);
    } else {
      setErrorMsg(result.message);
    }
  };

  const handleResetDefaultWards = async () => {
    if (confirm('Reset to official Tivsa Nagar Panchayat 17-Ward GIS boundaries (SECM LGD: 276289)?')) {
      await wardBoundaryService.resetToDefaultTivsaWards();
      setSuccessMsg('Reset to official Tivsa 17-ward boundaries.');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-sky-400" />
            <span>{getTranslation(language, 'settings')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure application preferences, GPS thresholds, and Tivsa 17-ward GIS boundary data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>

          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            {getTranslation(language, 'back')}
          </button>
        </div>
      </div>

      {/* Success / Error Messages */}
      {successMsg && (
        <div className="bg-emerald-950/80 border border-emerald-600/50 rounded-xl p-3 text-xs text-emerald-300 font-semibold flex items-center gap-2 shadow-md">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-950/80 border border-red-600/50 rounded-xl p-3 text-xs text-red-300 font-semibold flex items-center gap-2 shadow-md">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Section 1: Language */}
      <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Globe className="w-4 h-4 text-sky-400" />
          <span>Language (भाषा)</span>
        </div>
        <p className="text-xs text-slate-400">
          Choose your interface language: English, Marathi (मराठी), or Hindi (हिंदी).
        </p>

        <div className="grid grid-cols-3 gap-3 pt-1">
          {[
            { id: 'en', label: 'English', sub: 'English' },
            { id: 'mr', label: 'मराठी', sub: 'Marathi' },
            { id: 'hi', label: 'हिंदी', sub: 'Hindi' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleLanguageChange(item.id as Language)}
              className={`p-3 rounded-xl border text-center transition-all ${
                localSettings.language === item.id
                  ? 'bg-blue-600/20 border-blue-500 text-white font-bold shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <span className="text-sm block">{item.label}</span>
              <span className="text-[10px] text-slate-500">{item.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Section 2: GPS Accuracy Warning Threshold */}
      <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Crosshair className="w-4 h-4 text-amber-400" />
          <span>GPS Accuracy Warning Threshold</span>
        </div>
        <p className="text-xs text-slate-400">
          Display a warning before capturing if GPS horizontal accuracy exceeds this limit (meters).
        </p>

        <div className="grid grid-cols-4 gap-3 pt-1">
          {[10, 15, 20, 30].map((val) => (
            <button
              key={val}
              onClick={() => setLocalSettings((prev) => ({ ...prev, minGpsAccuracy: val }))}
              className={`py-2.5 px-3 rounded-xl border text-center font-mono text-xs transition-all ${
                localSettings.minGpsAccuracy === val
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              ±{val} meters
            </button>
          ))}
        </div>
      </div>

      {/* Section 3: Automatic Welcome Voice Announcement */}
      <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>Automatic Welcome Voice</span>
          </div>

          <button
            onClick={handleToggleSound}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
              localSettings.voiceAnnouncements
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {localSettings.voiceAnnouncements ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Voice Enabled</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Voice Muted</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Plays the official voice announcement: <strong>"Welcome to Sumit Boss."</strong> when the application launches on your Android device.
        </p>

        <div className="pt-1">
          <button
            onClick={handleTestWelcomeVoice}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
            <span>Test "Welcome to Sumit Boss." Voice</span>
          </button>
        </div>
      </div>

      {/* Section 4: Tivsa Nagar Panchayat 17-Ward GIS Boundaries */}
      <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Tivsa Nagar Panchayat 17-Ward GIS Data</span>
          </div>

          <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {activeDataset.wards.length} Wards Active
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Automated point-in-polygon ray-casting tests current coordinates against official municipal ward boundary polygons. If coordinates fall outside all 17 wards, the stamp automatically displays <strong>"Outside Tivsa Nagar Panchayat"</strong>.
        </p>

        {/* Dataset Metadata Display */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 text-xs space-y-1.5 font-mono">
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500 font-sans">Municipality:</span>
            <span className="font-bold text-white">Tivsa Nagar Panchayat (LGD: 276289)</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500 font-sans">Source:</span>
            <span className="text-sky-300">SECM Delimitation Plan (Ground-Truth v3)</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500 font-sans">CRS / Projection:</span>
            <span className="text-emerald-300">WGS84 Decimal Degrees (EPSG:4326)</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500 font-sans">Ward 1 Ground Truth:</span>
            <span className="text-amber-300">Anandwadi & Gaothan North</span>
          </div>
        </div>

        {/* Action Buttons: Export, Import, Reset */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={handleExportGeoJson}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export 17 Wards GeoJSON</span>
          </button>

          <button
            onClick={() => {
              setShowGeoJsonModal(true);
              setImportValidation(null);
            }}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import GeoJSON / KML</span>
          </button>

          <button
            onClick={handleResetDefaultWards}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Official 17 Wards</span>
          </button>
        </div>

        {/* Expandable Ward List */}
        <div className="pt-2">
          <button
            onClick={() => setWardListExpanded(!wardListExpanded)}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
          >
            <span>{wardListExpanded ? 'Hide' : 'View'} All 17 Tivsa Municipal Wards</span>
          </button>

          {wardListExpanded && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1 text-xs">
              {activeDataset.wards.map((ward) => (
                <div
                  key={ward.id}
                  className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-start gap-2"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: ward.color || '#3b82f6' }}
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-white block">
                      {ward.wardNumber.toLowerCase().includes('ward') ? ward.wardNumber : `Ward No. ${ward.wardNumber}`}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {ward.wardName || 'Tivsa Nagar Panchayat'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin GeoJSON / KML Import Modal */}
      {showGeoJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full text-white space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Admin Import: Tivsa 17-Ward Boundary GIS File</span>
            </h3>
            <p className="text-xs text-slate-400">
              Upload or paste official GeoJSON FeatureCollection or KML file containing the 17 municipal ward boundary polygons (WGS84 decimal degrees).
            </p>

            {/* File Upload Option */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                Upload File (.geojson, .kml, .json):
              </label>
              <input
                type="file"
                accept=".geojson,.kml,.json"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer bg-slate-950 p-2 rounded-xl border border-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                Or Paste GeoJSON / KML Raw Text:
              </label>
              <textarea
                rows={7}
                value={geoJsonInput}
                onChange={(e) => setGeoJsonInput(e.target.value)}
                placeholder='{ "type": "FeatureCollection", "features": [ ... ] }'
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Validation Warnings / Feedback */}
            {importValidation?.warnings && importValidation.warnings.length > 0 && (
              <div className="bg-amber-950/60 border border-amber-600/50 rounded-xl p-3 text-xs text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Validation Notice:</span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {importValidation.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowGeoJsonModal(false);
                  setErrorMsg(null);
                  setImportValidation(null);
                }}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportGeoJsonSubmit}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow transition-colors"
              >
                Validate & Apply GIS Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
