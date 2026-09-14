import React, { useState } from 'react';
import { DocumentHandover, HandoverStatusType } from '../types';
import { 
  FileText, 
  Plus, 
  Search, 
  Calendar, 
  CheckCircle, 
  ShieldAlert, 
  UserCheck, 
  Send, 
  Info, 
  Clock,
  X,
  User,
  MapPin,
  ClipboardCheck,
  PhoneCall,
  Trash2,
  HardDrive,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OfficeDocumentAdminProps {
  documents: DocumentHandover[];
  onAddDocument: (doc: Omit<DocumentHandover, 'id'>) => Promise<string>;
  onUpdateDocument: (id: string, updates: Partial<DocumentHandover>) => Promise<void>;
  onDeleteDocument?: (id: string) => Promise<void>;
  onOpenDataSave?: () => void;
  onOpenDataRestore?: () => void;
}

export default function OfficeDocumentAdmin({ 
  documents, 
  onAddDocument, 
  onUpdateDocument, 
  onDeleteDocument,
  onOpenDataSave,
  onOpenDataRestore
}: OfficeDocumentAdminProps) {
  // Lists filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, 保管中, 受渡済
  
  // New Document form states
  const [userName, setUserName] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [familyNotified, setFamilyNotified] = useState(false);
  const [notificationDate, setNotificationDate] = useState(new Date().toISOString().split('T')[0]);
  const [notificationStaff, setNotificationStaff] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handover overlay / form state
  const [handoverTarget, setHandoverTarget] = useState<DocumentHandover | null>(null);
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().split('T')[0]);
  const [handoverStaff, setHandoverStaff] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [isSavingHandover, setIsSavingHandover] = useState(false);

  // Quick contact log state
  const [contactTarget, setContactTarget] = useState<DocumentHandover | null>(null);
  const [quickContactDate, setQuickContactDate] = useState(new Date().toISOString().split('T')[0]);
  const [quickContactStaff, setQuickContactStaff] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  const resetForm = () => {
    setUserName('');
    setDocumentName('');
    setFamilyNotified(false);
    setNotificationDate(new Date().toISOString().split('T')[0]);
    setNotificationStaff('');
    setNotes('');
    setErrorMsg('');
  };

  // Submit new document arrival
  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setAddSuccess(false);

    if (!userName.trim()) {
      setErrorMsg('利用者名を入力してください。');
      return;
    }
    if (!documentName.trim()) {
      setErrorMsg('郵便物・書類・貴重品名を入力してください。');
      return;
    }

    setIsSubmitting(true);
    try {
      const newDoc: Omit<DocumentHandover, 'id'> = {
        createdAt: new Date().toISOString(),
        userName: userName.trim(),
        documentName: documentName.trim(),
        familyNotified: familyNotified,
        notificationDate: familyNotified ? notificationDate : undefined,
        notificationStaff: familyNotified ? notificationStaff.trim() : undefined,
        handoverStatus: '保管中',
        notes: notes.trim() || undefined
      };

      await onAddDocument(newDoc);
      setAddSuccess(true);
      resetForm();
      setTimeout(() => setAddSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg('登録中にエラーが発生しました。インターネット接続を確認して再試行してください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit handover completion
  const handleSaveHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverTarget) return;

    if (!handoverStaff.trim()) {
      alert('受渡担当者名を入力してください。');
      return;
    }
    if (!recipientName.trim()) {
      alert('受け取ったご家族名（受領者）を入力してください。');
      return;
    }

    setIsSavingHandover(true);
    try {
      await onUpdateDocument(handoverTarget.id, {
        handoverStatus: '受渡済',
        handoverDate: handoverDate,
        handoverStaff: handoverStaff.trim(),
        recipientName: recipientName.trim()
      });
      setHandoverTarget(null);
      setHandoverStaff('');
      setRecipientName('');
    } catch (err) {
      console.error(err);
      alert('保存中にエラーが発生しました。再試行してください。');
    } finally {
      setIsSavingHandover(false);
    }
  };

  // Submit family notification contact
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactTarget) return;

    if (!quickContactStaff.trim()) {
      alert('連絡担当者名を入力してください。');
      return;
    }

    setIsSavingContact(true);
    try {
      await onUpdateDocument(contactTarget.id, {
        familyNotified: true,
        notificationDate: quickContactDate,
        notificationStaff: quickContactStaff.trim()
      });
      setContactTarget(null);
      setQuickContactStaff('');
    } catch (err) {
      console.error(err);
      alert('連絡記録の更新中にエラーが発生しました。');
    } finally {
      setIsSavingContact(false);
    }
  };

  const filteredDocs = documents.filter((docEntry) => {
    const matchSearch = 
      docEntry.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      docEntry.documentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (docEntry.notes && docEntry.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (docEntry.recipientName && docEntry.recipientName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchStatus = statusFilter === 'all' || docEntry.handoverStatus === statusFilter;

    return matchSearch && matchStatus;
  });

  return (
    <div className="bg-slate-50 min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Core Description Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <h4 className="font-bold">⚠️ 重要：書類・貴重品は必ず【事務所手渡し】です</h4>
            <p>
              本人宛の重要郵便物や契約書類等は、居室へ直接運ばずに
              <strong>「事務所保管」</strong>とし、ご家族様が直接来所した際に
              <strong>「事務所窓口で受け渡し、署名確認」</strong>を行います。いつ・だれがだれに渡したかを必ず登録してください。
            </p>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Side: Register New Incoming Valuable Document */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden lg:col-span-1">
            <div className="bg-slate-800 px-6 py-4 text-white">
              <h3 className="font-bold flex items-center gap-2 text-sm sm:text-base">
                <Plus className="w-5 h-5 text-emerald-400" />
                郵便物・貴重品到着の新規登録
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                到着した書類等の名称と、対象の利用者名を登録します。
              </p>
            </div>

            <form onSubmit={handleAddDocument} className="p-6 space-y-4">
              {/* Utilizer Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="input-doc-user">
                  対象の利用者名 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-doc-user"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="例：佐藤 太郎"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Document / Valuable Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="input-doc-name">
                  書類・郵便物・貴重品の内容 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-doc-name"
                  required
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="例：後期高齢者被保険者証、書留等"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Checkbox: Family Notified? */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="checkbox-family-notified"
                    checked={familyNotified}
                    onChange={(e) => setFamilyNotified(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="checkbox-family-notified" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    到着をすでに家族へ連絡した
                  </label>
                </div>

                <AnimatePresence>
                  {familyNotified && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 pt-1"
                    >
                      <div>
                        <label className="block text-xxs font-bold text-slate-600 mb-0.5">
                          連絡日
                        </label>
                        <input
                          type="date"
                          value={notificationDate}
                          onChange={(e) => setNotificationDate(e.target.value)}
                          className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xxs font-bold text-slate-600 mb-0.5">
                          連絡担当者
                        </label>
                        <input
                          type="text"
                          placeholder="例：高橋 玲子"
                          value={notificationStaff}
                          onChange={(e) => setNotificationStaff(e.target.value)}
                          className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Free notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  備考・保管場所など (任意)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="例：金庫内、または事務所書類棚３番引き出しに保管しています。"
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Success notification */}
              {addSuccess && (
                <div className="p-3 bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>貴重品の到着を登録しました。</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-100 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Register Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-sm transition shadow-sm"
              >
                {isSubmitting ? '登録中...' : '到着郵便物として登録する'}
              </button>
            </form>
          </div>

          {/* Right Side: Storage & Handover Real-Time Logs */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden lg:col-span-2">
            
            {/* Table Search & Title Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  郵便・書類・貴重品 管理状況一覧
                </h2>
                <p className="text-xxs text-slate-500 mt-0.5">※家族が事務所へ取りに来たら「受渡処理」を行ってください</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {onOpenDataSave && (
                  <button
                    onClick={onOpenDataSave}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded text-xs font-semibold transition cursor-pointer shadow-2xs"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                    <span>データ保存</span>
                  </button>
                )}
                {onOpenDataRestore && (
                  <button
                    onClick={onOpenDataRestore}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded text-xs font-semibold transition cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-600" />
                    <span>データ復元</span>
                  </button>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="利用者名・書類名検索"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1 text-xs rounded border border-slate-300 outline-none w-44"
                  />
                </div>

                {/* Status selector */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700"
                >
                  <option value="all">すべて表示</option>
                  <option value="保管中">保管中のみ</option>
                  <option value="受渡済">受渡済のみ</option>
                </select>
              </div>
            </div>

            {/* List */}
            {filteredDocs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-white">
                <Info className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">郵便物・貴重品情報が見つかりません</p>
                <p className="text-xs text-slate-400 mt-1">該当するデータがないか、検索ワードをクリアしてください。</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-semibold text-xxs">
                      <th className="p-3 text-center whitespace-nowrap w-24">ステータス</th>
                      <th className="p-3">対象利用者</th>
                      <th className="p-3">貴重品・郵便物内容</th>
                      <th className="p-3">到着・連絡管理</th>
                      <th className="p-3">受渡記録 (いつ・だれが・だれに)</th>
                      <th className="p-3 text-center w-24">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredDocs.map((docEntry) => {
                      const isStorage = docEntry.handoverStatus === '保管中';
                      const dateObj = new Date(docEntry.createdAt);
                      const formattedArrival = dateObj.toLocaleDateString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <tr key={docEntry.id} className={`hover:bg-slate-50/50 transition ${isStorage ? 'bg-amber-50/10' : 'bg-emerald-50/5'}`}>
                          {/* Status */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className={`inline-block px-2 py-1 rounded-full font-bold text-xxs border ${
                              isStorage 
                                ? 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse' 
                                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}>
                              {docEntry.handoverStatus}
                            </span>
                          </td>

                          {/* User */}
                          <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                            {docEntry.userName} 様
                          </td>

                          {/* Title / Description */}
                          <td className="p-3 max-w-xs md:max-w-sm">
                            <p className="font-bold text-slate-800">{docEntry.documentName}</p>
                            {docEntry.notes && (
                              <p className="text-xxs text-slate-500 mt-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-150 inline-block">
                                <span className="font-semibold text-slate-700">メモ:</span> {docEntry.notes}
                              </p>
                            )}
                          </td>

                          {/* Contacted */}
                          <td className="p-3 space-y-1">
                            <p className="text-xxs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formattedArrival} 到着
                            </p>
                            {docEntry.familyNotified ? (
                              <div className="text-xxs text-emerald-800 bg-emerald-100/80 border border-emerald-100 p-1 rounded inline-block">
                                家族連絡済 ({docEntry.notificationDate})
                                <span className="block text-slate-500 text-4xs">担当: {docEntry.notificationStaff}</span>
                              </div>
                            ) : (
                              <div className="text-xxs text-rose-800 bg-rose-100 p-1 rounded inline-block font-semibold">
                                家族未連絡
                              </div>
                            )}
                          </td>

                          {/* Handover Log */}
                          <td className="p-3">
                            {!isStorage ? (
                              <div className="text-xxs space-y-1 text-slate-700 bg-emerald-50 p-1.5 rounded border border-emerald-100">
                                <p className="font-semibold flex items-center gap-1 text-emerald-800">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  受渡完了
                                </p>
                                <p><strong>受渡日時:</strong> {docEntry.handoverDate}</p>
                                <p><strong>窓口担当:</strong> {docEntry.handoverStaff}</p>
                                <p><strong>受領家族:</strong> {docEntry.recipientName}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xxs flex items-center gap-1 italic">
                                <MapPin className="w-3 h-3" />
                                事務所金庫・保管中
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-center">
                              {isStorage ? (
                                <>
                                  {/* Handover Complete button */}
                                  <button
                                    onClick={() => setHandoverTarget(docEntry)}
                                    className="w-full px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-4xs transition flex items-center justify-center gap-0.5 shadow-sm"
                                  >
                                    <ClipboardCheck className="w-3 h-3" />
                                    受渡を記録
                                  </button>

                                  {/* Register Quick Notification button */}
                                  {!docEntry.familyNotified && (
                                    <button
                                      onClick={() => setContactTarget(docEntry)}
                                      className="w-full px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded font-bold text-4xs transition flex items-center justify-center gap-0.5"
                                    >
                                      <PhoneCall className="w-3 h-3" />
                                      連絡完了を記録
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-emerald-600 font-bold text-xxs flex items-center justify-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                  受取済
                                </span>
                              )}

                              {/* Delete Button */}
                              {onDeleteDocument && (
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`${docEntry.userName} 様の「${docEntry.documentName}」の受渡記録を完全に削除してよろしいですか？\n※この操作は取り消せません。`)) {
                                      try {
                                        await onDeleteDocument(docEntry.id);
                                        alert('削除が完了しました。');
                                      } catch (err) {
                                        console.error(err);
                                        const detail = err instanceof Error ? err.message : String(err);
                                        alert(`削除中にエラーが発生しました:\n${detail}`);
                                      }
                                    }
                                  }}
                                  className="mt-1 px-2 py-0.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded text-4xs font-semibold transition flex items-center justify-center gap-0.5 border border-transparent hover:border-rose-200"
                                  title="この記録を削除する"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  削除
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* MODAL 1: Recording Handover */}
      <AnimatePresence>
        {handoverTarget && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-full max-w-md"
            >
              <div className="bg-emerald-700 px-6 py-4 text-white flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-emerald-300" />
                  窓口での「受渡完了」を記録
                </h3>
                <button onClick={() => setHandoverTarget(null)} className="text-white hover:text-emerald-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveHandover} className="p-6 space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg border text-xs text-slate-600">
                  <p><strong>利用者名:</strong> {handoverTarget.userName} 様</p>
                  <p><strong>書類/貴重品:</strong> {handoverTarget.documentName}</p>
                </div>

                {/* Handover Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    受け渡し日 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={handoverDate}
                    onChange={(e) => setHandoverDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded border border-slate-300 bg-white"
                  />
                </div>

                {/* Handover Staff Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    事務所窓口・手渡し担当者名 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例：高橋 玲子"
                    value={handoverStaff}
                    onChange={(e) => setHandoverStaff(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded border border-slate-300 outline-none"
                  />
                </div>

                {/* Recipient Family Name / Signature Confirmation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    受け取ったご家族のお名前（受領者） <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例：長男 佐藤 一郎、長女 山田 花子"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded border border-slate-300 outline-none"
                  />
                  <p className="text-4xs text-slate-400 mt-1">※貴重品につき、ご署名等を確認した上でお渡し完了を記録してください。</p>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setHandoverTarget(null)}
                    className="flex-1 py-2 border border-slate-200 text-slate-600 rounded text-sm font-semibold hover:bg-slate-50 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingHandover}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-bold shadow-sm"
                  >
                    {isSavingHandover ? '保存中...' : '受渡完了を記録する'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Recording Quick Family Contact */}
      <AnimatePresence>
        {contactTarget && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-full max-w-sm"
            >
              <div className="bg-sky-700 px-6 py-4 text-white flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-sky-200" />
                  家族への「到着連絡」を記録
                </h3>
                <button onClick={() => setContactTarget(null)} className="text-white hover:text-sky-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveContact} className="p-6 space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg border text-xs text-slate-600">
                  <p><strong>利用者名:</strong> {contactTarget.userName} 様</p>
                  <p><strong>到着書類:</strong> {contactTarget.documentName}</p>
                </div>

                {/* Contact Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    連絡した日 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={quickContactDate}
                    onChange={(e) => setQuickContactDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded border border-slate-300 bg-white"
                  />
                </div>

                {/* Contact Staff Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    連絡した担当者名 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例：高橋 玲子"
                    value={quickContactStaff}
                    onChange={(e) => setQuickContactStaff(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded border border-slate-300 outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setContactTarget(null)}
                    className="flex-1 py-2 border border-slate-200 text-slate-600 rounded text-sm font-semibold hover:bg-slate-50 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingContact}
                    className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded text-sm font-bold shadow-sm"
                  >
                    {isSavingContact ? '保存中...' : '連絡済を記録する'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
