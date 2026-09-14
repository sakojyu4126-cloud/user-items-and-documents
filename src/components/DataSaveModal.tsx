import React, { useState, useMemo } from 'react';
import { SuppliesRequest, DocumentHandover } from '../types';
import { X, Printer, FileSpreadsheet, HardDrive, CheckCircle2 } from 'lucide-react';

interface DataSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliesRequests: SuppliesRequest[];
  documentHandovers: DocumentHandover[];
}

export default function DataSaveModal({
  isOpen,
  onClose,
  suppliesRequests,
  documentHandovers
}: DataSaveModalProps) {
  // 印刷・出力範囲の選択（全期間 or 期間限定）
  const [dateRangeType, setDateRangeType] = useState<'all' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // 選択範囲によるフィルタリング
  const filteredSupplies = useMemo(() => {
    return suppliesRequests.filter((req) => {
      if (dateRangeType === 'all') return true;
      if (!req.createdAt) return false;

      const reqDate = new Date(req.createdAt);
      if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        if (reqDate < start) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        if (reqDate > end) return false;
      }

      return true;
    });
  }, [suppliesRequests, dateRangeType, customStartDate, customEndDate]);

  if (!isOpen) return null;

  // 1. 印刷処理
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const rangeLabel = 
      dateRangeType === 'custom' 
        ? `${customStartDate || '開始指定なし'} ～ ${customEndDate || '終了指定なし'}` 
        : '全期間';

    const rowsHtml = filteredSupplies.map((req, idx) => {
      const itemsStr = (req.selectedItems || [])
        .map(si => `${si.category}: ${si.items.join(', ')}`)
        .join('<br>');
      const formattedDate = req.createdAt ? new Date(req.createdAt).toLocaleString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';

      return `
        <tr>
          <td style="text-align:center; padding:6px 8px; border:1px solid #cbd5e1;">${idx + 1}</td>
          <td style="padding:6px 8px; border:1px solid #cbd5e1; white-space:nowrap;">${formattedDate}</td>
          <td style="padding:6px 8px; border:1px solid #cbd5e1; font-weight:bold;">${req.userName || ''}</td>
          <td style="padding:6px 8px; border:1px solid #cbd5e1;">${req.helperName || ''}</td>
          <td style="padding:6px 8px; border:1px solid #cbd5e1; font-size:11px;">${itemsStr || '-'}</td>
          <td style="padding:6px 8px; border:1px solid #cbd5e1; font-size:11px;">${req.otherDetails || ''}</td>
          <td style="text-align:center; padding:6px 8px; border:1px solid #cbd5e1; white-space:nowrap;">${req.contactStatus || '未連絡'}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>物品依頼一覧 印刷帳票</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: sans-serif; font-size: 12px; color: #1e293b; margin: 0; padding: 10px; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px; }
          h1 { margin: 0; font-size: 18px; color: #0f172a; }
          .meta { font-size: 11px; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #f1f5f9; padding: 8px; border: 1px solid #94a3b8; font-size: 11px; text-align: left; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>利用者物品依頼一覧 帳票</h1>
            <div class="meta" style="margin-top:4px;">
              期間: ${rangeLabel}
            </div>
          </div>
          <div class="meta">
            印刷日時: ${new Date().toLocaleString('ja-JP')}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:40px; text-align:center;">No.</th>
              <th style="width:110px;">申請日時</th>
              <th style="width:130px;">利用者名</th>
              <th style="width:100px;">ヘルパー</th>
              <th>申請物品</th>
              <th style="width:160px;">備考・詳細</th>
              <th style="width:80px; text-align:center;">連絡状況</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="text-align:center; padding:20px; color:#64748b;">対象のデータがありません</td></tr>'}
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // 2. CSV保存（選択範囲）
  const handleExportCSV = () => {
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const BOM = '\uFEFF';
      let csv = BOM + "申請日時,利用者名,申請ヘルパー,状態,緊急度,申請物品,その他詳細,受付日,事務所対応者,連絡方法,連絡状況\n";

      filteredSupplies.forEach(req => {
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

      setSaveSuccessMsg('Excel用CSVファイルを保存しました。');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  // 3. 全データJSONバックアップ保存
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
      a.download = `介護連絡管理_全データ_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSaveSuccessMsg('全データ（JSONバックアップ）を保存しました。');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <span>データ保存・印刷</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          
          {/* 期間選択（全期間 or 期間限定の2つのみ） */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="text-xs font-bold text-slate-700 block">期間の指定</label>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDateRangeType('all')}
                className={`py-2 px-3 text-center rounded-lg font-bold border transition cursor-pointer ${
                  dateRangeType === 'all'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                全期間
              </button>

              <button
                type="button"
                onClick={() => setDateRangeType('custom')}
                className={`py-2 px-3 text-center rounded-lg font-bold border transition cursor-pointer ${
                  dateRangeType === 'custom'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                期間限定
              </button>
            </div>

            {dateRangeType === 'custom' && (
              <div className="flex items-center gap-2 pt-2 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <span className="text-slate-400 font-bold">～</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            )}
          </div>

          {saveSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* シンプルなアクションボタン群 */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>印刷する（A4帳票）</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-sm transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel用CSVで保存</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs transition cursor-pointer"
            >
              <HardDrive className="w-4 h-4 text-slate-500" />
              <span>全データ保存（JSONバックアップ）</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            閉じる
          </button>
        </div>

      </div>
    </div>
  );
}
