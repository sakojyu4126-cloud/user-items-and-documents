import React, { useState } from 'react';
import { SuppliesRequest, ContactMethodType, ContactStatusType } from '../types';
import { 
  Search, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertOctagon, 
  MessageSquare, 
  PhoneCall, 
  X, 
  Save, 
  Filter, 
  Info,
  RefreshCw,
  Trash2,
  HardDrive,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OfficeSuppliesAdminProps {
  requests: SuppliesRequest[];
  onUpdateRequest: (id: string, updates: Partial<SuppliesRequest>) => Promise<void>;
  onDeleteRequest?: (id: string) => Promise<void>;
  onOpenDataSave?: () => void;
  onOpenDataRestore?: () => void;
}

export default function OfficeSuppliesAdmin({ 
  requests, 
  onUpdateRequest, 
  onDeleteRequest,
  onOpenDataSave,
  onOpenDataRestore
}: OfficeSuppliesAdminProps) {
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, 未連絡, 連絡済, 連絡したが返事がない
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Selected request for editing
  const [selectedRequest, setSelectedRequest] = useState<SuppliesRequest | null>(null);
  
  // Edit form states
  const [receiptDate, setReceiptDate] = useState('');
  const [officeStaff, setOfficeStaff] = useState('');
  const [contactMethod, setContactMethod] = useState<ContactMethodType>('');
  const [contactStatus, setContactStatus] = useState<ContactStatusType>('未連絡');
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Handle click on row to select and open editing form
  const handleSelectRequest = (req: SuppliesRequest) => {
    setSelectedRequest(req);
    setReceiptDate(req.receiptDate || new Date().toISOString().split('T')[0]); // Default to today
    setOfficeStaff(req.officeStaff || '');
    setContactMethod(req.contactMethod || '');
    setContactStatus(req.contactStatus || '未連絡');
    setUpdateSuccess(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setIsUpdating(true);
    try {
      await onUpdateRequest(selectedRequest.id, {
        receiptDate: receiptDate || undefined,
        officeStaff: officeStaff.trim() || undefined,
        contactMethod: contactMethod || undefined,
        contactStatus: contactStatus
      });
      
      setUpdateSuccess(true);
      setTimeout(() => {
        setUpdateSuccess(false);
        setSelectedRequest(null); // Close panel on success after delay
      }, 1200);
    } catch (err) {
      console.error(err);
      alert('更新中にエラーが発生しました。接続を確認して再試行してください。');
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter requests based on filters
  const filteredRequests = requests.filter((req) => {
    // 1. Search term (User Name or Helper Name or details)
    const matchSearch = 
      req.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.helperName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.otherDetails.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.selectedItems.some(si => si.items.some(item => item.toLowerCase().includes(searchTerm.toLowerCase())));

    // 2. Contact Status Filter
    const matchStatus = statusFilter === 'all' || req.contactStatus === statusFilter;

    // 3. Date Filters (based on request createdAt)
    const reqDateStr = req.createdAt.split('T')[0];
    const matchStart = !startDate || reqDateStr >= startDate;
    const matchEnd = !endDate || reqDateStr <= endDate;

    return matchSearch && matchStatus && matchStart && matchEnd;
  });

  const getStatusBadgeClass = (status: ContactStatusType) => {
    switch (status) {
      case '連絡済':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case '連絡したが返事がない':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case '未連絡':
      default:
        return 'bg-rose-100 text-rose-800 border-rose-200 font-bold animate-pulse';
    }
  };

  const getUrgencyBadgeClass = (urgency: string) => {
    return urgency === '至急'
      ? 'bg-rose-600 text-white font-bold animate-pulse'
      : 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="bg-slate-50 min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            一覧検索・絞り込み
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Word Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="利用者名・ヘルパー名・詳細検索"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Status Selector */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-700"
              >
                <option value="all">すべての連絡状況</option>
                <option value="未連絡">未連絡 (未対応のみ)</option>
                <option value="連絡済">連絡済 (対応完了)</option>
                <option value="連絡したが返事がない">連絡したが返事がない</option>
              </select>
            </div>

            {/* Start Date */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 shrink-0">開始:</span>
              <div className="relative w-full">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700"
                />
              </div>
            </div>

            {/* End Date */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 shrink-0">終了:</span>
              <div className="relative w-full">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700"
                />
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setStartDate('');
                setEndDate('');
              }}
              className="py-2 px-3 border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 rounded-lg transition shrink-0"
            >
              フィルターをクリア
            </button>
          </div>
        </div>

        {/* Dashboard Layout (Main content grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Table Area */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden lg:col-span-2">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-800">物品依頼 リアルタイム一覧</h2>
                <span className="text-xs font-normal text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full ml-1">
                  全 {filteredRequests.length} 件
                </span>
              </div>
              <div className="flex items-center gap-2">
                {onOpenDataSave && (
                  <button
                    onClick={onOpenDataSave}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                    <span>データ保存</span>
                  </button>
                )}
                {onOpenDataRestore && (
                  <button
                    onClick={onOpenDataRestore}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-600" />
                    <span>データ復元</span>
                  </button>
                )}
                <p className="text-xxs text-slate-400 hidden md:block ml-1">※行クリックで詳細編集</p>
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-white">
                <Info className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">条件に該当する依頼が見つかりません</p>
                <p className="text-xs text-slate-400 mt-1">
                  フィルター条件を変更するか、左のタブから新しく物品依頼を登録してください。
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 text-xs font-semibold">
                      <th className="p-3 text-center whitespace-nowrap w-16">緊急度</th>
                      <th className="p-3 whitespace-nowrap">利用者名</th>
                      <th className="p-3">依頼内容 (チェック項目/詳細)</th>
                      <th className="p-3 text-center whitespace-nowrap">現状</th>
                      <th className="p-3 whitespace-nowrap">申請ヘルパー</th>
                      <th className="p-3 text-center whitespace-nowrap">連絡状況</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredRequests.map((req) => {
                      const isSelected = selectedRequest?.id === req.id;
                      const dateObj = new Date(req.createdAt);
                      const formattedDate = dateObj.toLocaleDateString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <tr
                          key={req.id}
                          onClick={() => handleSelectRequest(req)}
                          className={`hover:bg-emerald-50/40 transition-colors cursor-pointer ${
                            isSelected ? 'bg-emerald-50 font-medium border-l-4 border-l-emerald-500' : ''
                          } ${req.contactStatus === '未連絡' ? 'bg-rose-50/20' : ''}`}
                        >
                          {/* Urgency */}
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-xxs ${getUrgencyBadgeClass(req.urgency)}`}>
                              {req.urgency}
                            </span>
                          </td>

                          {/* Utilizer Name & Date */}
                          <td className="p-3">
                            <p className="font-bold text-slate-900">{req.userName} 様</p>
                            <p className="text-xxs text-slate-400 flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {formattedDate} 申請
                            </p>
                          </td>

                          {/* Request content */}
                          <td className="p-3 space-y-1.5 max-w-xs md:max-w-md">
                            {req.selectedItems && req.selectedItems.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {req.selectedItems.map((cat, idx) => (
                                  <div key={idx} className="bg-slate-100 text-slate-800 rounded px-1.5 py-0.5 text-xxs border border-slate-200 flex items-center gap-1">
                                    <span className="font-semibold text-emerald-700">{cat.category.replace(/^[①②③④]\s*/, '')}:</span>
                                    <span>{cat.items.join(', ')}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            
                            {req.otherDetails && (
                              <p className="text-xs text-slate-600 bg-amber-50 border border-amber-100/80 p-1.5 rounded line-clamp-2">
                                <span className="font-semibold text-amber-800">[詳細説明]:</span> {req.otherDetails}
                              </p>
                            )}
                          </td>

                          {/* Current Status */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                              req.status === '無' 
                                ? 'bg-red-100 text-red-800' 
                                : req.status === '残少' 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {req.status}
                            </span>
                          </td>

                          {/* Helper Name */}
                          <td className="p-3 text-slate-700 text-xs">
                            {req.helperName}
                          </td>

                          {/* Contact Status */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-1 text-xs rounded-full border ${getStatusBadgeClass(req.contactStatus)}`}>
                              {req.contactStatus}
                            </span>
                            {req.receiptDate && (
                              <p className="text-xxs text-slate-400 mt-1">
                                {req.officeStaff || '受付者'}: {req.receiptDate}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Action/Update Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden lg:col-span-1">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 text-white">
              <h3 className="font-bold flex items-center gap-1.5">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                事務所・受付連絡の処理
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                一覧から依頼をクリックして、受付連絡の対応を記録します。
              </p>
            </div>

            <AnimatePresence mode="wait">
              {selectedRequest ? (
                <motion.form
                  key="edit-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleUpdate}
                  className="p-6 space-y-5"
                >
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-slate-500">選択中</span>
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="font-bold text-slate-800 text-base">{selectedRequest.userName} 様</p>
                    <p className="text-xs text-slate-600">
                      <strong>申請日時:</strong> {new Date(selectedRequest.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-600">
                      <strong>申請ヘルパー:</strong> {selectedRequest.helperName}
                    </p>
                    <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200">
                      <strong>申請物品:</strong>
                      <div className="mt-1 space-y-1">
                        {selectedRequest.selectedItems.map((si, i) => (
                          <div key={i} className="text-xxs font-medium bg-white px-2 py-0.5 border rounded">
                            {si.category}: {si.items.join(', ')}
                          </div>
                        ))}
                        {selectedRequest.otherDetails && (
                          <p className="mt-1.5 text-slate-600 text-xxs leading-relaxed bg-amber-50 p-1.5 rounded border border-amber-100">
                            <strong>詳細説明:</strong> {selectedRequest.otherDetails}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Edit: Receipt Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      受付日 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={receiptDate}
                      onChange={(e) => setReceiptDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 bg-white"
                    />
                  </div>

                  {/* Edit: Staff Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      事務所担当者名 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="例：高橋 玲子"
                      value={officeStaff}
                      onChange={(e) => setOfficeStaff(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
                    />
                  </div>

                  {/* Edit: Contact Method */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      連絡方法 <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        { label: 'LINE', value: 'LINE' },
                        { label: '電話/SMS', value: '電話またはSMS' },
                        { label: 'LINE＆電話', value: 'LINE＆電話' }
                      ] as { label: string; value: ContactMethodType }[]).map((method) => (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => setContactMethod(method.value)}
                          className={`py-2 px-1 text-center rounded-lg border text-xxs font-semibold transition ${
                            contactMethod === method.value
                              ? 'bg-slate-700 border-slate-800 text-white'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {method.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Edit: Contact Status */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      連絡ステータス <span className="text-rose-500">*</span>
                    </label>
                    <div className="space-y-1.5">
                      {([
                        { value: '未連絡', label: '🔴 未連絡 (未対応)' },
                        { value: '連絡済', label: '🟢 連絡済 (対応完了)' },
                        { value: '連絡したが返事がない', label: '🟡 連絡したが返事がない' }
                      ] as { value: ContactStatusType; label: string }[]).map((status) => (
                        <button
                          key={status.value}
                          type="button"
                          onClick={() => setContactStatus(status.value)}
                          className={`w-full py-2 px-3 text-left rounded-lg border text-xs font-medium transition flex items-center justify-between ${
                            contactStatus === status.value
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{status.label}</span>
                          {contactStatus === status.value && (
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Save Status Alert */}
                  {updateSuccess && (
                    <div className="p-3 bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>情報を保存しました！(リアルタイム同期済)</span>
                    </div>
                  )}

                  {/* Save Action */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Save className="w-4 h-4" />
                      {isUpdating ? '保存中...' : '受付・連絡情報を保存する'}
                    </button>
                  </div>

                  {/* Delete Action */}
                  {onDeleteRequest && (
                    <div className="pt-4 border-t border-slate-150 mt-4">
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`${selectedRequest.userName} 様のこの物品依頼データを完全に削除してよろしいですか？\n※この操作は取り消せません。`)) {
                            try {
                              setIsUpdating(true);
                              await onDeleteRequest(selectedRequest.id);
                              alert('削除が完了しました。');
                              setSelectedRequest(null);
                            } catch (err) {
                              console.error(err);
                              const detail = err instanceof Error ? err.message : String(err);
                              alert(`削除中にエラーが発生しました:\n${detail}`);
                            } finally {
                              setIsUpdating(false);
                            }
                          }
                        }}
                        disabled={isUpdating}
                        className="w-full py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 border border-rose-200"
                      >
                        <Trash2 className="w-4 h-4" />
                        この依頼を完全に削除する
                      </button>
                    </div>
                  )}
                </motion.form>
              ) : (
                <motion.div
                  key="empty-panel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-12 text-center text-slate-400"
                >
                  <Info className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs">左側の一覧から、処理を行う利用者名をクリックしてください。</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>
    </div>
  );
}
