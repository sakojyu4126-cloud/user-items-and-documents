import React, { useState, useRef } from 'react';
import { SuppliesRequest, DocumentHandover } from '../types';
import { restoreBackupData } from '../lib/firebaseUtils';
import { 
  X, 
  Download, 
  Upload, 
  HardDrive, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Table, 
  RefreshCw,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliesRequests: SuppliesRequest[];
  documentHandovers: DocumentHandover[];
  onLocalRestore: (supplies: SuppliesRequest[], docs: DocumentHandover[]) => void;
}

export default function DataManagementModal({
  isOpen,
  onClose,
  suppliesRequests,
  documentHandovers,
  onLocalRestore
}: DataManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  
  // Export states
  const [exportSuccessMsg, setExportSuccessMsg] = useState('');
  
  // Import states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<{
    supplies?: SuppliesRequest[];
    documents?: DocumentHandover[];
    exportedAt?: string;
  } | null>(null);
  const [parseError, setParseError] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<{ current: number; total: number } | null>(null);
  const [restoreResult, setRestoreResult] = useState<{
    success: boolean;
    message: string;
    errors?: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. Export JSON backup
  const handleExportJSON = () => {
    try {
      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);
      
      const backupPayload = {
        title: "利用者物品＆書類（受取） 連絡管理システム バックアップ",
        version: "1.0",
        exportedAt: now.toISOString(),
        suppliesRequestsCount: suppliesRequests.length,
        documentHandoversCount: documentHandovers.length,
        suppliesRequests: suppliesRequests,
        documentHandovers: documentHandovers
      };

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `介護連絡管理_全データ保存_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccessMsg('✅ 全データのバックアップファイル（JSON）をPCへ保存しました。');
      setTimeout(() => setExportSuccessMsg(''), 6000);
    } catch (err) {
      console.error(err);
      alert('バックアップ保存中にエラーが発生しました。');
    }
  };

  // 2. Export CSV for Excel
  const handleExportCSV = () => {
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      
      // UTF-8 BOM for Excel Japanese support
      const BOM = '\uFEFF';
      let csv = BOM + "申請日時,利用者名,申請ヘルパー,状態,緊急度,申請物品,その他詳細,受付日,事務所対応者,連絡方法,連絡状況\n";

      suppliesRequests.forEach(req => {
        const itemsStr = (req.selectedItems || [])
          .map(si => `${si.category}: [${si.items.join(', ')}]`)
          .join(' / ')
          .replace(/"/g, '""');
        
        const row = [
          `"${req.createdAt || ''}"`,
          `"${req.userName || ''}"`,
          `"${req.helperName || ''}"`,
          `"${req.status || ''}"`,
          `"${req.urgency || ''}"`,
          `"${itemsStr}"`,
          `"${(req.otherDetails || '').replace(/"/g, '""')}"`,
          `"${req.receiptDate || ''}"`,
          `"${req.officeStaff || ''}"`,
          `"${req.contactMethod || ''}"`,
          `"${req.contactStatus || ''}"`
        ];
        csv += row.join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `物品依頼一覧_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccessMsg('✅ 物品一覧をExcel用CSVファイルとして保存しました。');
      setTimeout(() => setExportSuccessMsg(''), 6000);
    } catch (err) {
      console.error(err);
      alert('CSV出力中にエラーが発生しました。');
    }
  };

  // 3. Handle file selection for import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParseError('');
    setParsedData(null);
    setRestoreResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Support both full backup object and bare arrays
        let supplies: SuppliesRequest[] = [];
        let documents: DocumentHandover[] = [];

        if (parsed.suppliesRequests && Array.isArray(parsed.suppliesRequests)) {
          supplies = parsed.suppliesRequests;
        } else if (Array.isArray(parsed) && parsed[0]?.selectedItems) {
          supplies = parsed;
        }

        if (parsed.documentHandovers && Array.isArray(parsed.documentHandovers)) {
          documents = parsed.documentHandovers;
        }

        if (supplies.length === 0 && documents.length === 0) {
          setParseError('有効なバックアップデータ（物品依頼または書類受渡）が見つかりませんでした。ファイル形式をご確認ください。');
          return;
        }

        setParsedData({
          supplies,
          documents,
          exportedAt: parsed.exportedAt
        });
      } catch (err) {
        console.error(err);
        setParseError('ファイルの読み込みに失敗しました。正しいJSONバックアップファイルを選択してください。');
      }
    };
    reader.readAsText(file);
  };

  // 4. Execute Restore (Firestore write + Local update)
  const handleExecuteRestore = async () => {
    if (!parsedData) return;
    const { supplies = [], documents = [] } = parsedData;

    setIsRestoring(true);
    setRestoreResult(null);
    setRestoreProgress({ current: 0, total: supplies.length + documents.length });

    try {
      // 1. Immediately reflect into local UI so user sees it right away
      onLocalRestore(supplies, documents);

      // 2. Write to Firestore database in parallel
      const result = await restoreBackupData(
        supplies, 
        documents, 
        (current, total) => setRestoreProgress({ current, total })
      );

      setRestoreResult({
        success: true,
        message: `復元が完了しました！物品依頼 ${result.suppliesSuccess}件、書類受渡 ${result.docsSuccess}件が正常に同期・反映されました。`,
        errors: result.errors.length > 0 ? result.errors : undefined
      });
    } catch (err: any) {
      console.error(err);
      setRestoreResult({
        success: false,
        message: `復元処理中にエラーが発生しました: ${err?.message || '不明なエラー'}`
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                データ保存・データ復元（バックアップ管理）
              </h2>
              <p className="text-xs text-slate-400">PC事務所操作専用：手元PCへのデータ保存とバックアップ復元</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'export'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>データ保存（PCへバックアップ）</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>データ復元（バックアップから読み込み）</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-5">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-emerald-900 text-xs leading-relaxed flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-emerald-950 mb-1">
                    手元PCへの定期的なデータ保存をおすすめします
                  </p>
                  <p>
                    クラウド（Google Firebase）にもデータは保管されていますが、PCにバックアップファイルを保存しておくことで、万が一のGoogle側の通信一時制限や回線障害時にも、手元のファイルからいつでも即座に復元・閲覧が可能になります。
                  </p>
                </div>
              </div>

              {/* Data Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 block">保存対象の物品依頼</span>
                  <span className="text-2xl font-bold text-slate-800">{suppliesRequests.length}</span>
                  <span className="text-xs text-slate-400 ml-1">件</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 block">保存対象の書類受渡</span>
                  <span className="text-2xl font-bold text-slate-800">{documentHandovers.length}</span>
                  <span className="text-xs text-slate-400 ml-1">件</span>
                </div>
              </div>

              {exportSuccessMsg && (
                <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {exportSuccessMsg}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleExportJSON}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>全データをPCに保存する（推奨・JSON形式）</span>
                </button>
                <p className="text-xxs text-slate-400 text-center">
                  ※物品依頼・書類受渡・詳細メモを含むすべてのデータが1つのファイルで保存されます
                </p>

                <div className="pt-2 border-t border-slate-200">
                  <button
                    onClick={handleExportCSV}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs transition cursor-pointer"
                  >
                    <Table className="w-4 h-4 text-slate-500" />
                    <span>物品依頼一覧をExcel用CSVで出力・保存する</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT / RESTORE */}
          {activeTab === 'import' && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-xs leading-relaxed flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-amber-950 mb-1">
                    保存したバックアップファイルからデータを復元
                  </p>
                  <p>
                    PCに保存してあるバックアップファイル（.json）を選択してください。
                    読み込まれたデータは、現在の画面一覧に即座に反映され、データベース（Firestore）にも安全に同期されます。
                  </p>
                </div>
              </div>

              {/* File Selector */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                  id="backup-file-input"
                />
                <label
                  htmlFor="backup-file-input"
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center"
                >
                  <FileText className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-sm font-bold text-slate-700">
                    {selectedFile ? selectedFile.name : 'バックアップファイル（.json）を選択またはドラッグ＆ドロップ'}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">
                    クリックしてPC内のバックアップファイルを選択してください
                  </span>
                </label>
              </div>

              {parseError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  {parseError}
                </div>
              )}

              {/* Parsed Preview */}
              {parsedData && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-xs text-slate-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    読み込みプレビュー
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block">復元対象の物品依頼</span>
                      <span className="text-lg font-bold text-slate-800">{parsedData.supplies?.length || 0} 件</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block">復元対象の書類受渡</span>
                      <span className="text-lg font-bold text-slate-800">{parsedData.documents?.length || 0} 件</span>
                    </div>
                  </div>
                  {parsedData.exportedAt && (
                    <p className="text-xxs text-slate-400">
                      保存日時: {new Date(parsedData.exportedAt).toLocaleString('ja-JP')}
                    </p>
                  )}
                </div>
              )}

              {/* Progress Indicator */}
              {isRestoring && restoreProgress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-600 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      データベースへ復元処理中...
                    </span>
                    <span>{restoreProgress.current} / {restoreProgress.total} 件</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 transition-all duration-200"
                      style={{
                        width: `${restoreProgress.total > 0 ? (restoreProgress.current / restoreProgress.total) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Restore Result Message */}
              {restoreResult && (
                <div className={`p-4 rounded-xl text-xs space-y-2 ${
                  restoreResult.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-900'
                }`}>
                  <p className="font-bold flex items-center gap-2">
                    {restoreResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    {restoreResult.message}
                  </p>
                  {restoreResult.errors && restoreResult.errors.length > 0 && (
                    <div className="text-xxs text-amber-800 bg-white/80 p-2 rounded border border-amber-200 space-y-1">
                      <p className="font-semibold">※一部書き込みスキップ（ローカル画面には反映済み）：</p>
                      {restoreResult.errors.slice(0, 3).map((err, i) => (
                        <p key={i}>・{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              {parsedData && !isRestoring && (
                <button
                  onClick={handleExecuteRestore}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  <Upload className="w-5 h-5" />
                  <span>この内容で復元を実行する</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
          >
            閉じる
          </button>
        </div>

      </div>
    </div>
  );
}
