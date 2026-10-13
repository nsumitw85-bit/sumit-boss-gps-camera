import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Phone,
  Briefcase,
  MapPin,
  Calendar,
  FileText,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { Worker, WorkCategory, Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { dbService } from '../services/db';

interface WorkerManagerProps {
  language: Language;
  workers: Worker[];
  categories: WorkCategory[];
  selectedWorkerId: string;
  onSelectWorkerId: (id: string) => void;
  onRefresh: () => void;
  onBack: () => void;
}

export const WorkerManager: React.FC<WorkerManagerProps> = ({
  language,
  workers,
  categories,
  selectedWorkerId,
  onSelectWorkerId,
  onRefresh,
  onBack,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formWorkerId, setFormWorkerId] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formWard, setFormWard] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formJoiningDate, setFormJoiningDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const filteredWorkers = workers.filter((w) => {
    const term = searchTerm.toLowerCase();
    return (
      w.name.toLowerCase().includes(term) ||
      (w.id && w.id.toLowerCase().includes(term)) ||
      (w.designation && w.designation.toLowerCase().includes(term)) ||
      (w.wardNumber && w.wardNumber.toLowerCase().includes(term))
    );
  });

  const handleOpenAdd = () => {
    setEditingWorker(null);
    setFormName('');
    setFormWorkerId(`WRK-${Math.floor(100 + Math.random() * 900)}`);
    setFormMobile('');
    setFormDesignation('Sanitation Worker');
    setFormCategoryId(categories[0]?.id || '');
    setFormWard('');
    setFormArea('Central Market');
    setFormJoiningDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setFormName(worker.name);
    setFormWorkerId(worker.id);
    setFormMobile(worker.mobile || '');
    setFormDesignation(worker.designation || '');
    setFormCategoryId(worker.workCategoryId || '');
    setFormWard(worker.wardNumber || '');
    setFormArea(worker.area || '');
    setFormJoiningDate(worker.joiningDate || '');
    setFormNotes(worker.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const workerToSave: Worker = {
      id: editingWorker ? editingWorker.id : (formWorkerId.trim() || `WRK-${Date.now()}`),
      name: formName.trim(),
      mobile: formMobile.trim() || undefined,
      designation: formDesignation.trim() || undefined,
      workCategoryId: formCategoryId || undefined,
      wardNumber: formWard.trim() || undefined,
      area: formArea.trim() || undefined,
      joiningDate: formJoiningDate || undefined,
      notes: formNotes.trim() || undefined,
      createdAt: editingWorker ? editingWorker.createdAt : Date.now(),
    };

    await dbService.saveWorker(workerToSave);
    setIsModalOpen(false);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await dbService.deleteWorker(id);
    if (selectedWorkerId === id) {
      onSelectWorkerId('');
    }
    setDeletingId(null);
    onRefresh();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-md">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            <span>{getTranslation(language, 'workersTitle')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage worker documentation, assigned wards, and contact details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            {getTranslation(language, 'back')}
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>{getTranslation(language, 'addWorker')}</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={getTranslation(language, 'searchWorker')}
          className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Worker List */}
      {filteredWorkers.length === 0 ? (
        <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl p-10 text-center text-slate-400 space-y-3">
          <Users className="w-10 h-10 mx-auto text-slate-500" />
          <p className="text-sm font-medium">{getTranslation(language, 'noWorkersFound')}</p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{getTranslation(language, 'addWorker')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWorkers.map((worker) => {
            const isSelected = selectedWorkerId === worker.id;
            const category = categories.find((c) => c.id === worker.workCategoryId);

            return (
              <div
                key={worker.id}
                className={`bg-slate-800/80 rounded-2xl p-4 border transition-all shadow-md ${
                  isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow">
                      {worker.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-white">{worker.name}</h3>
                        {isSelected && (
                          <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-sky-400 font-medium">
                        {worker.designation || 'Field Staff'} • <span className="font-mono text-slate-400">{worker.id}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(worker)}
                      className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Edit Worker"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(worker.id)}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition-colors"
                      title="Delete Worker"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{category?.name || 'Sanitation'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{worker.wardNumber || 'Ward N/A'}</span>
                  </div>
                  {worker.mobile && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="font-mono">{worker.mobile}</span>
                    </div>
                  )}
                  {worker.area && (
                    <div className="flex items-center gap-1.5 text-slate-400 truncate">
                      <span>Area: {worker.area}</span>
                    </div>
                  )}
                </div>

                {worker.notes && (
                  <p className="mt-2 text-[11px] text-slate-400 italic bg-slate-900/40 p-1.5 rounded">
                    "{worker.notes}"
                  </p>
                )}

                <div className="mt-3 pt-2">
                  <button
                    onClick={() => onSelectWorkerId(isSelected ? '' : worker.id)}
                    className={`w-full py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 hover:bg-slate-650 text-slate-200'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Selected for Next Photo</span>
                      </>
                    ) : (
                      <span>Select for Photo</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Worker Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 text-white space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>{editingWorker ? getTranslation(language, 'editWorker') : getTranslation(language, 'addWorker')}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {getTranslation(language, 'workerName')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Ramesh Kadam"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {getTranslation(language, 'workerId')}
                  </label>
                  <input
                    type="text"
                    value={formWorkerId}
                    onChange={(e) => setFormWorkerId(e.target.value)}
                    placeholder="WRK-101"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {getTranslation(language, 'mobileNumber')}
                  </label>
                  <input
                    type="tel"
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                    placeholder="9822XXXXXX"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {getTranslation(language, 'designation')}
                  </label>
                  <input
                    type="text"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    placeholder="Supervisor / Staff"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {getTranslation(language, 'categoryManagement')}
                  </label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- None --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {language === 'mr' ? c.nameMr : language === 'hi' ? c.nameHi : c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {getTranslation(language, 'wardPrompt')}
                  </label>
                  <input
                    type="text"
                    value={formWard}
                    onChange={(e) => setFormWard(e.target.value)}
                    placeholder="e.g. Ward 1 (or auto GPS)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {getTranslation(language, 'areaPrompt')}
                  </label>
                  <input
                    type="text"
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    placeholder="Market / Station Rd"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {getTranslation(language, 'joiningDate')}
                  </label>
                  <input
                    type="date"
                    value={formJoiningDate}
                    onChange={(e) => setFormJoiningDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {getTranslation(language, 'workerNotes')}
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Additional duties or remarks..."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors"
                >
                  {getTranslation(language, 'cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-900/40"
                >
                  {getTranslation(language, 'save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-sm w-full p-5 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  {getTranslation(language, 'deleteWorker')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getTranslation(language, 'confirmDeleteWorker')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
              >
                {getTranslation(language, 'cancel')}
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
              >
                {getTranslation(language, 'delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
