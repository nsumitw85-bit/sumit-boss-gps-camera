import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Edit2,
  Trash2,
  X,
  Briefcase,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { WorkCategory, Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { dbService } from '../services/db';

interface CategoryManagerProps {
  language: Language;
  categories: WorkCategory[];
  selectedCategoryId: string;
  onSelectCategoryId: (id: string) => void;
  onRefresh: () => void;
  onBack: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  language,
  categories,
  selectedCategoryId,
  onSelectCategoryId,
  onRefresh,
  onBack,
}) => {
  const [editingCategory, setEditingCategory] = useState<WorkCategory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formNameMr, setFormNameMr] = useState('');
  const [formNameHi, setFormNameHi] = useState('');
  const [formDesc, setFormDesc] = useState('');

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormName('');
    setFormNameMr('');
    setFormNameHi('');
    setFormDesc('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: WorkCategory) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormNameMr(cat.nameMr || '');
    setFormNameHi(cat.nameHi || '');
    setFormDesc(cat.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const catToSave: WorkCategory = {
      id: editingCategory ? editingCategory.id : `cat-${Date.now()}`,
      name: formName.trim(),
      nameMr: formNameMr.trim() || formName.trim(),
      nameHi: formNameHi.trim() || formName.trim(),
      description: formDesc.trim() || undefined,
      isDefault: editingCategory ? editingCategory.isDefault : false,
      createdAt: editingCategory ? editingCategory.createdAt : Date.now(),
    };

    await dbService.saveCategory(catToSave);
    setIsModalOpen(false);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await dbService.deleteCategory(id);
    if (selectedCategoryId === id) {
      onSelectCategoryId('');
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
            <FolderKanban className="w-6 h-6 text-indigo-400" />
            <span>{getTranslation(language, 'categoriesTitle')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure municipal and field work categories with Marathi and Hindi labels.
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
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-900/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{getTranslation(language, 'addCategory')}</span>
          </button>
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;

          return (
            <div
              key={cat.id}
              className={`bg-slate-800/80 rounded-2xl p-4 border transition-all shadow-md flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(cat.id)}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-base text-white">{cat.name}</h3>
                  <div className="flex flex-col gap-0.5 mt-1 text-xs text-indigo-300">
                    {cat.nameMr && <span>मराठी: {cat.nameMr}</span>}
                    {cat.nameHi && <span>हिंदी: {cat.nameHi}</span>}
                  </div>
                  {cat.description && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/60">
                <button
                  onClick={() => onSelectCategoryId(isSelected ? '' : cat.id)}
                  className={`w-full py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-650 text-slate-200'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Active for Next Photo</span>
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 text-white space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-indigo-400" />
                <span>{editingCategory ? getTranslation(language, 'editCategory') : getTranslation(language, 'addCategory')}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {getTranslation(language, 'categoryName')} *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Drain Cleaning"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {getTranslation(language, 'categoryNameMr')}
                </label>
                <input
                  type="text"
                  value={formNameMr}
                  onChange={(e) => setFormNameMr(e.target.value)}
                  placeholder="उदा. नाली साफसफाई"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {getTranslation(language, 'categoryNameHi')}
                </label>
                <input
                  type="text"
                  value={formNameHi}
                  onChange={(e) => setFormNameHi(e.target.value)}
                  placeholder="उदा. नाली सफाई"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Details of the civic maintenance task..."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500"
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-900/40"
                >
                  {getTranslation(language, 'save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-sm w-full p-5 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">{getTranslation(language, 'deleteCategory')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getTranslation(language, 'confirmDeleteCategory')}
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
