import { Package, FileText, ClipboardList, Laptop, Smartphone, HardDrive, Upload } from 'lucide-react';
import { motion } from 'motion/react';

interface HeaderProps {
  activeTab: 'helper' | 'office-supplies' | 'office-docs';
  setActiveTab: (tab: 'helper' | 'office-supplies' | 'office-docs') => void;
  uncontactedCount: number;
  pendingDocsCount: number;
  onOpenDataSave?: () => void;
  onOpenDataRestore?: () => void;
}

export default function Header({ 
  activeTab, 
  setActiveTab, 
  uncontactedCount, 
  pendingDocsCount,
  onOpenDataSave,
  onOpenDataRestore
}: HeaderProps) {
  return (
    <header id="app-header" className="bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* App Title & Info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500 rounded-md text-slate-950 font-bold">
                <ClipboardList className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                利用者物品＆書類（受取） 連絡管理システム
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              複数デバイス間リアルタイム同期システム (ヘルパー・事務所連携)
            </p>
          </div>

          {/* Actions & Quick Stats */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            {onOpenDataSave && (
              <button
                id="btn-header-data-save"
                onClick={onOpenDataSave}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                <span>データ保存</span>
              </button>
            )}

            {onOpenDataRestore && (
              <button
                id="btn-header-data-restore"
                onClick={onOpenDataRestore}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>データ復元</span>
              </button>
            )}

            <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              クラウド同期
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto gap-2 mt-6 scrollbar-none border-b border-slate-800 pb-px">
          <button
            id="tab-helper"
            onClick={() => setActiveTab('helper')}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-t-lg whitespace-nowrap ${
              activeTab === 'helper'
                ? 'text-emerald-400 bg-slate-800/80 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>【スマホ】ヘルパー物品依頼</span>
          </button>

          <button
            id="tab-office-supplies"
            onClick={() => setActiveTab('office-supplies')}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-t-lg whitespace-nowrap ${
              activeTab === 'office-supplies'
                ? 'text-emerald-400 bg-slate-800/80 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>【PC】事務所・物品連絡管理</span>
            {uncontactedCount > 0 && (
              <span className="ml-1.5 px-2 py-0.5 text-xxs font-bold bg-amber-500 text-slate-950 rounded-full animate-bounce">
                {uncontactedCount}
              </span>
            )}
          </button>

          <button
            id="tab-office-docs"
            onClick={() => setActiveTab('office-docs')}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-t-lg whitespace-nowrap ${
              activeTab === 'office-docs'
                ? 'text-emerald-400 bg-slate-800/80 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>【PC】郵便・貴重品受渡管理</span>
            {pendingDocsCount > 0 && (
              <span className="ml-1.5 px-2 py-0.5 text-xxs font-bold bg-blue-500 text-white rounded-full">
                {pendingDocsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
