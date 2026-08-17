import React, { useState, useEffect } from 'react';
import { CATEGORY_GROUPS } from '../data/categories';
import { SuppliesRequest, StatusType, UrgencyType } from '../types';
import { AlertTriangle, Plus, CheckCircle, Trash2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HelperRequestFormProps {
  onAddRequest: (request: Omit<SuppliesRequest, 'id'>) => Promise<string>;
  allRequests: SuppliesRequest[];
}

export default function HelperRequestForm({ onAddRequest, allRequests }: HelperRequestFormProps) {
  const [userName, setUserName] = useState('');
  const [helperName, setHelperName] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: boolean }>({});
  const [itemQuantities, setItemQuantities] = useState<{ [key: string]: number }>({});
  const [otherDetails, setOtherDetails] = useState('');
  const [status, setStatus] = useState<StatusType>('残少');
  const [urgency, setUrgency] = useState<UrgencyType>('普通');
  
  // アコーディオンの開閉状態（初期状態ですべて閉じる）
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    sanitary: false,
    daily: false,
    clothing: false,
    bedding: false,
    other: false,
  });

  // Alert/Warning states
  const [duplicateWarning, setDuplicateWarning] = useState<{
    daysAgo: number;
    request: SuppliesRequest;
  } | null>(null);
  const [bypassWarning, setBypassWarning] = useState(false);
  
  // Submission result states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Run duplicate check whenever userName changes
  useEffect(() => {
    if (!userName.trim()) {
      setDuplicateWarning(null);
      setBypassWarning(false);
      return;
    }

    const trimmedName = userName.trim();
    // 全角・半角スペースを除去し、末尾の「様」を取り除く強力な正規化関数
    const normalizeName = (name: any) => {
      if (!name || typeof name !== 'string') return '';
      let n = name.replace(/[\s\u3000]/g, ''); // すべての半角・全角スペースを除去
      if (n.endsWith('様')) {
        n = n.slice(0, -1);
      }
      return n.trim();
    };
    const searchName = normalizeName(trimmedName);
    const now = new Date();
    
    // Find requests for the same user in the last 10 days (240 hours)
    const duplicate = allRequests.find(req => {
      if (!req.userName || !req.createdAt) return false;
      if (normalizeName(req.userName) !== searchName) return false;
      
      const reqDate = new Date(req.createdAt);
      if (isNaN(reqDate.getTime())) return false;
      
      const diffMs = now.getTime() - reqDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      return diffHours >= 0 && diffHours <= 240; // Within 240 hours (10 days)
    });

    if (duplicate) {
      const reqDate = new Date(duplicate.createdAt);
      const diffDays = Math.ceil((now.getTime() - reqDate.getTime()) / (1000 * 60 * 60 * 24));
      setDuplicateWarning({
        daysAgo: diffDays,
        request: duplicate
      });
    } else {
      setDuplicateWarning(null);
      setBypassWarning(false);
    }
  }, [userName, allRequests]);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleCheckboxChange = (itemName: string) => {
    setSelectedItems(prev => {
      const nextChecked = !prev[itemName];
      if (nextChecked) {
        setItemQuantities(q => ({ ...q, [itemName]: 1 }));
      }
      return {
        ...prev,
        [itemName]: nextChecked
      };
    });
  };

  const handleQuantityChange = (itemName: string, delta: number) => {
    setItemQuantities(prev => {
      const current = prev[itemName] || 1;
      const next = Math.max(1, current + delta);
      return {
        ...prev,
        [itemName]: next
      };
    });
  };

  const getCheckedItemsCount = () => {
    return Object.values(selectedItems).filter(Boolean).length;
  };

  const getGroupCheckedCount = (groupItems: string[]) => {
    return groupItems.filter(item => selectedItems[item]).length;
  };

  const resetForm = () => {
    setUserName('');
    setHelperName('');
    setSelectedItems({});
    setItemQuantities({});
    setOtherDetails('');
    setStatus('残少');
    setUrgency('普通');
    setDuplicateWarning(null);
    setBypassWarning(false);
    setErrorMsg('');
    setOpenSections({
      sanitary: false,
      daily: false,
      clothing: false,
      bedding: false,
      other: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation
    if (!userName.trim()) {
      setErrorMsg('利用者名を入力してください。');
      return;
    }
    if (!helperName.trim()) {
      setErrorMsg('申請者（ヘルパー名）を入力してください。');
      return;
    }

    const checkedItemNames = Object.keys(selectedItems).filter(item => selectedItems[item]);
    if (checkedItemNames.length === 0 && !otherDetails.trim()) {
      setErrorMsg('物品にチェックを入れるか、または「その他の品・詳細説明」に入力してください。');
      return;
    }

    // Submit時にも直接最新のallRequestsを検索し、重複を検知する絶対ガード
    const trimmedNameForSubmit = userName.trim();
    const normalizeNameForSubmit = (name: any) => {
      if (!name || typeof name !== 'string') return '';
      let n = name.replace(/[\s\u3000]/g, ''); // すべての半角・全角スペースを除去
      if (n.endsWith('様')) {
        n = n.slice(0, -1);
      }
      return n.trim();
    };
    const searchNameForSubmit = normalizeNameForSubmit(trimmedNameForSubmit);
    const nowForSubmit = new Date();

    const actualDuplicate = allRequests.find(req => {
      if (!req.userName || !req.createdAt) return false;
      if (normalizeNameForSubmit(req.userName) !== searchNameForSubmit) return false;
      
      const reqDate = new Date(req.createdAt);
      if (isNaN(reqDate.getTime())) return false;
      
      const diffMs = nowForSubmit.getTime() - reqDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      return diffHours >= 0 && diffHours <= 240; // 10日以内
    });

    if (actualDuplicate && !bypassWarning) {
      setErrorMsg('10日以内に同じ利用者様の申請があります。「重複警告を確認した」にチェックを入れてください。');
      // 念のため、見失っていた警告状態を再セットして警告ボックスを表示
      const reqDate = new Date(actualDuplicate.createdAt);
      const diffDays = Math.ceil((nowForSubmit.getTime() - reqDate.getTime()) / (1000 * 60 * 60 * 24));
      setDuplicateWarning({
        daysAgo: diffDays,
        request: actualDuplicate
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Map selected items back to category grouped array (with quantities)
      const groupedSelectedItems: { category: string; items: string[] }[] = [];
      
      CATEGORY_GROUPS.forEach(group => {
        const groupCheckedItems = group.items.filter(item => selectedItems[item]);
        if (groupCheckedItems.length > 0) {
          const itemsWithQuantities = groupCheckedItems.map(item => {
            const qty = itemQuantities[item] || 1;
            return `${item} ×${qty}`;
          });
          groupedSelectedItems.push({
            category: group.name,
            items: itemsWithQuantities
          });
        }
      });

      // 自動で「様」を付与して保存する
      let finalUserName = userName.trim();
      if (!finalUserName.endsWith('様')) {
        finalUserName = `${finalUserName}様`;
      }

      const newRequest: Omit<SuppliesRequest, 'id'> = {
        createdAt: new Date().toISOString(),
        userName: finalUserName,
        helperName: helperName.trim(),
        selectedItems: groupedSelectedItems,
        otherDetails: otherDetails.trim(),
        status,
        urgency,
        contactStatus: '未連絡'
      };

      await onAddRequest(newRequest);
      
      setShowSuccess(true);
      resetForm();
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      setErrorMsg('送信中にエラーが発生しました。インターネット接続を確認して再試行してください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
        
        {/* Success Modal/Toast */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg flex items-start gap-3 shadow-sm"
              id="success-alert"
            >
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">物品依頼を送信しました！</p>
                <p className="text-sm mt-0.5">事務所のPCへリアルタイムで同期されました。確認をお待ちください。</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Plus className="w-5 h-5" />
              必要物品の申請（現場ヘルパー用）
            </h2>
            <p className="text-xs text-emerald-100 mt-1">
              必要になった物品を選択して送信してください。事務所PCへ即座に送信・共有されます。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* 1 & 2. Utilizer and Helper Name */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="input-username">
                  利用者名 <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    id="input-username"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="例：佐藤 太郎"
                    className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-base"
                  />
                  <span className="text-base font-bold text-slate-700 shrink-0 select-none">様</span>
                </div>
              </div>

              <div className="w-full sm:w-auto sm:min-w-[150px] sm:max-w-[200px]">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="input-helpername">
                  申請者（ヘルパー） <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-helpername"
                  required
                  value={helperName}
                  onChange={(e) => setHelperName(e.target.value)}
                  placeholder="例：山田（苗字のみ）"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-base"
                />
              </div>
            </div>

            {/* Red Alert: Duplicate Warning within 10 Days */}
            <AnimatePresence>
              {duplicateWarning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-50 border-2 border-rose-200 rounded-xl overflow-hidden shadow-sm"
                  id="duplicate-warning-box"
                >
                  <div className="p-4 flex gap-3">
                    <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <h4 className="font-bold text-rose-800 text-sm">
                        ⚠️ 【重複注意】10日以内に同じ利用者名の申請があります！
                      </h4>
                      <div className="text-xs text-rose-700 space-y-1">
                        <p>
                          <strong>対象利用者：</strong> {duplicateWarning.request.userName} 様
                        </p>
                        <p>
                          <strong>前回の申請：</strong> {duplicateWarning.daysAgo} 日前 ({new Date(duplicateWarning.request.createdAt).toLocaleDateString('ja-JP', {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})})
                        </p>
                        <p>
                          <strong>申請者：</strong> {duplicateWarning.request.helperName} ヘルパー
                        </p>
                        <p>
                          <strong>申請内容：</strong>{' '}
                          {duplicateWarning.request.selectedItems.map(si => si.items.join(', ')).join(' / ') || 'その他の品・詳細説明のみ'}
                        </p>
                        {duplicateWarning.request.otherDetails && (
                          <p><strong>前回の詳細：</strong> {duplicateWarning.request.otherDetails}</p>
                        )}
                        <p>
                          <strong>連絡状況：</strong>{' '}
                          <span className={`px-1.5 py-0.5 rounded font-bold text-xxs ${
                            duplicateWarning.request.contactStatus === '連絡済' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {duplicateWarning.request.contactStatus}
                          </span>
                        </p>
                      </div>
                      
                      <div className="pt-2 border-t border-rose-100 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="checkbox-bypass"
                          checked={bypassWarning}
                          onChange={(e) => setBypassWarning(e.target.checked)}
                          className="w-5 h-5 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                        />
                        <label htmlFor="checkbox-bypass" className="text-xs font-bold text-rose-800 cursor-pointer select-none">
                          上記の申請を確認し、別件・または追加分として申請を継続する。
                        </label>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 3. Status and Urgency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  現状ステータス <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['無', '残少', '新規'] as StatusType[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition duration-150 ${
                        status === st
                          ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  緊急度 <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['普通', '至急'] as UrgencyType[]).map((urg) => (
                    <button
                      key={urg}
                      type="button"
                      onClick={() => setUrgency(urg)}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition duration-150 ${
                        urgency === urg
                          ? urg === '至急'
                            ? 'bg-rose-600 border-rose-700 text-white shadow-sm font-bold'
                            : 'bg-slate-600 border-slate-700 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {urg}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Categorized Predefined Items */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                <span>必要物品の選択</span>
                <span className="text-xs font-normal text-slate-500">
                  選択数: <strong className="text-emerald-600">{getCheckedItemsCount()}</strong> 品
                </span>
              </h3>

              <div className="space-y-3">
                {CATEGORY_GROUPS.map((group) => {
                  const checkedCount = getGroupCheckedCount(group.items);
                  const isOpen = !!openSections[group.id];
                  
                  return (
                    <div key={group.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all hover:border-slate-300">
                      {/* Accordion Header */}
                      <button
                        type="button"
                        onClick={() => toggleSection(group.id)}
                        className="w-full flex items-center justify-between p-4 text-left transition bg-slate-50/50 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-1.5 h-3 rounded-full transition-all ${checkedCount > 0 ? 'bg-emerald-500 scale-125' : 'bg-slate-400'}`} />
                          <span className="text-sm font-bold text-slate-800">{group.name}</span>
                          {checkedCount > 0 && (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full">
                              {checkedCount}
                            </span>
                          )}
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-slate-500 shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                        )}
                      </button>

                      {/* Accordion Content */}
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                          >
                            <div className="p-4 border-t border-slate-100 bg-white">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {group.items.map((item) => {
                                  const isChecked = !!selectedItems[item];
                                  const quantity = itemQuantities[item] || 1;
                                  return (
                                    <div
                                      key={item}
                                      onClick={() => handleCheckboxChange(item)}
                                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition select-none ${
                                        isChecked
                                          ? 'bg-emerald-50/70 border-emerald-300 text-slate-900 font-medium'
                                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50/20'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          readOnly
                                          className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 shrink-0"
                                        />
                                        <span className="text-sm truncate">{item}</span>
                                      </div>
                                      
                                      {isChecked && (
                                        <div 
                                          onClick={(e) => e.stopPropagation()} 
                                          className="flex items-center bg-white border border-slate-200 rounded-md shadow-sm ml-2 h-8 shrink-0"
                                        >
                                          <button
                                            type="button"
                                            onClick={() => handleQuantityChange(item, -1)}
                                            className="w-8 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-l-md font-bold text-sm transition"
                                          >
                                            -
                                          </button>
                                          <span className="px-2 text-sm font-bold text-slate-800 min-w-[20px] text-center select-none">
                                            {quantity}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleQuantityChange(item, 1)}
                                            className="w-8 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-r-md font-bold text-sm transition"
                                          >
                                            +
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {/* ⑤ その他の品・詳細説明 Accordion */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all hover:border-slate-300">
                  {/* Accordion Header for Other */}
                  <button
                    type="button"
                    onClick={() => toggleSection('other')}
                    className="w-full flex items-center justify-between p-4 text-left transition bg-slate-50/50 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-1.5 h-3 rounded-full transition-all ${otherDetails.trim().length > 0 ? 'bg-teal-500 scale-125' : 'bg-slate-400'}`} />
                      <span className="text-sm font-bold text-slate-800">⑤ その他の品・詳細説明</span>
                      {otherDetails.trim().length > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-teal-100 text-teal-800 rounded-full">
                          入力あり
                        </span>
                      )}
                    </div>
                    {openSections.other ? (
                      <ChevronUp className="w-5 h-5 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {/* Accordion Content for Other */}
                  <AnimatePresence initial={false}>
                    {openSections.other && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                      >
                        <div className="p-4 border-t border-slate-100 bg-white">
                          <textarea
                            value={otherDetails}
                            onChange={(e) => setOtherDetails(e.target.value)}
                            placeholder="例：替えシーツは2枚。リハビリパンツはＭサイズが希望。尿取りパットレギュラーを１パック等、詳細をご記入ください。"
                            rows={4}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm bg-white"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-rose-100 border border-rose-200 text-rose-900 rounded-lg text-sm flex items-center gap-2 font-medium">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-150">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                className="px-4 py-3 border border-slate-200 hover:bg-slate-100 text-slate-600 font-medium rounded-lg text-sm transition shrink-0"
              >
                入力をリセット
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!!duplicateWarning && !bypassWarning)}
                className={`flex-1 py-3 px-6 rounded-lg text-sm font-bold text-white transition shadow flex items-center justify-center gap-2 ${
                  isSubmitting || (!!duplicateWarning && !bypassWarning)
                    ? 'bg-slate-300 border-slate-300 cursor-not-allowed text-slate-500'
                    : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600'
                }`}
              >
                {isSubmitting ? '送信中...' : '物品依頼を送信する'}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
