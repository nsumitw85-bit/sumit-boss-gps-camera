import React, { useState } from 'react';
import {
  FileText,
  Download,
  Share2,
  Calendar,
  Filter,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Users,
  Briefcase,
  MapPin,
  FileCheck,
} from 'lucide-react';
import { CapturedPhoto, Worker, WorkCategory, Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { PdfReportService, ReportFilterOptions } from '../services/pdfReport';

interface ReportsViewProps {
  language: Language;
  photos: CapturedPhoto[];
  workers: Worker[];
  categories: WorkCategory[];
  onBack: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  language,
  photos,
  workers,
  categories,
  onBack,
}) => {
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterWorkerId, setFilterWorkerId] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterWard, setFilterWard] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const wards = Array.from(new Set(photos.map((p) => p.wardNumber).filter(Boolean)));

  const filteredPhotos = photos.filter((p) => {
    // Date match if specified
    if (filterStartDate) {
      const photoDate = new Date(p.timestamp).toISOString().split('T')[0];
      if (photoDate < filterStartDate) return false;
    }
    if (filterEndDate) {
      const photoDate = new Date(p.timestamp).toISOString().split('T')[0];
      if (photoDate > filterEndDate) return false;
    }

    if (filterWorkerId && p.workerId !== filterWorkerId) return false;
    if (filterCategoryId && p.workCategoryId !== filterCategoryId) return false;
    if (filterWard && p.wardNumber !== filterWard) return false;

    return true;
  });

  const selectedWorker = workers.find((w) => w.id === filterWorkerId);
  const selectedCategory = categories.find((c) => c.id === filterCategoryId);

  const handleExportPdf = async () => {
    if (filteredPhotos.length === 0) {
      setStatusMessage('No records match your filter criteria.');
      return;
    }

    setIsGenerating(true);
    setStatusMessage(null);

    try {
      const filterOpts: ReportFilterOptions = {
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        workerId: filterWorkerId || undefined,
        workerName: selectedWorker?.name || undefined,
        categoryId: filterCategoryId || undefined,
        categoryName: selectedCategory?.name || undefined,
        wardNumber: filterWard || undefined,
      };

      const doc = await PdfReportService.generateReport(filteredPhotos, filterOpts);
      const filename = `SumitBoss_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      setStatusMessage('PDF Report exported successfully.');
    } catch (err: any) {
      console.error('Failed to generate report:', err);
      setStatusMessage('Failed to generate PDF report: ' + (err.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSharePdf = async () => {
    if (filteredPhotos.length === 0) return;

    try {
      setIsGenerating(true);
      const filterOpts: ReportFilterOptions = {
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        workerName: selectedWorker?.name,
        categoryName: selectedCategory?.name,
        wardNumber: filterWard || undefined,
      };

      const doc = await PdfReportService.generateReport(filteredPhotos, filterOpts);
      const pdfBlob = doc.output('blob');
      const filename = `SumitBoss_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });

      if (navigator.share) {
        await navigator.share({
          title: 'Sumit Boss - Field Photo Documentation Report',
          text: `Sumit Boss Documentation Report (${filteredPhotos.length} records)`,
          files: [file],
        });
      } else {
        doc.save(filename);
      }
    } catch (err) {
      console.warn('Share error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-md">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-400" />
            <span>{getTranslation(language, 'reportsTitle')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate and export official A4 PDF documentation reports with thumbnails and verified GPS data.
          </p>
        </div>

        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition-colors self-start sm:self-auto"
        >
          {getTranslation(language, 'back')}
        </button>
      </div>

      {/* Filter Parameters Form */}
      <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700 shadow-lg space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
          <Filter className="w-4 h-4 text-amber-400" />
          <span>Report Filter Criteria</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Start Date */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>From Date</span>
            </label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>To Date</span>
            </label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          {/* Worker Filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Filter by Worker</span>
            </label>
            <select
              value={filterWorkerId}
              onChange={(e) => setFilterWorkerId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="">{getTranslation(language, 'allWorkers')}</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.designation || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-sky-400" />
              <span>Filter by Work Category</span>
            </label>
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="">{getTranslation(language, 'allCategories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {language === 'mr' ? c.nameMr : language === 'hi' ? c.nameHi : c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ward Filter */}
          <div className="sm:col-span-2">
            <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Filter by Ward Number</span>
            </label>
            <select
              value={filterWard}
              onChange={(e) => setFilterWard(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="">{getTranslation(language, 'allWards')}</option>
              {wards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status preview of matches */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 font-semibold">
              Matching Records: <span className="text-emerald-400 font-bold">{filteredPhotos.length}</span> of {photos.length} total photos
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFilterStartDate('');
                setFilterEndDate('');
                setFilterWorkerId('');
                setFilterCategoryId('');
                setFilterWard('');
              }}
              className="text-slate-400 hover:text-white underline text-[11px]"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 bg-blue-500/15 border border-blue-500/30 rounded-xl text-blue-200 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Generate and Share Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleExportPdf}
            disabled={isGenerating || filteredPhotos.length === 0}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
              isGenerating || filteredPhotos.length === 0
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-amber-900/30'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>{isGenerating ? 'Generating A4 PDF...' : getTranslation(language, 'generatePdf')}</span>
          </button>

          <button
            onClick={handleSharePdf}
            disabled={isGenerating || filteredPhotos.length === 0}
            className={`sm:w-48 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
              isGenerating || filteredPhotos.length === 0
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>{getTranslation(language, 'shareReport')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
