import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import HelperRequestForm from './components/HelperRequestForm';
import OfficeSuppliesAdmin from './components/OfficeSuppliesAdmin';
import OfficeDocumentAdmin from './components/OfficeDocumentAdmin';
import DataSaveModal from './components/DataSaveModal';
import DataRestoreModal from './components/DataRestoreModal';
import { SuppliesRequest, DocumentHandover } from './types';
import { 
  subscribeSuppliesRequests, 
  addSuppliesRequest, 
  updateSuppliesRequest, 
  deleteSuppliesRequest,
  subscribeDocumentHandovers, 
  addDocumentHandover, 
  updateDocumentHandover,
  deleteDocumentHandover
} from './lib/firebaseUtils';
import { ClipboardList } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'helper' | 'office-supplies' | 'office-docs'>('helper');
  
  // Initialize from localStorage cache if available so UI doesn't flicker or blank out
  const [suppliesRequests, setSuppliesRequests] = useState<SuppliesRequest[]>(() => {
    try {
      const cached = localStorage.getItem('kaigo_supplies_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [documentHandovers, setDocumentHandovers] = useState<DocumentHandover[]>(() => {
    try {
      const cached = localStorage.getItem('kaigo_docs_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => {
    try {
      const s = localStorage.getItem('kaigo_supplies_cache');
      const d = localStorage.getItem('kaigo_docs_cache');
      return !(s || d);
    } catch {
      return true;
    }
  });

  const [showDataSaveModal, setShowDataSaveModal] = useState(false);
  const [showDataRestoreModal, setShowDataRestoreModal] = useState(false);

  // Auto-sync non-empty datasets to localStorage as persistent local mirror
  useEffect(() => {
    if (suppliesRequests.length > 0) {
      try {
        localStorage.setItem('kaigo_supplies_cache', JSON.stringify(suppliesRequests));
      } catch (e) {
        console.warn('Failed to mirror supplies to localStorage:', e);
      }
    }
  }, [suppliesRequests]);

  useEffect(() => {
    if (documentHandovers.length > 0) {
      try {
        localStorage.setItem('kaigo_docs_cache', JSON.stringify(documentHandovers));
      } catch (e) {
        console.warn('Failed to mirror documents to localStorage:', e);
      }
    }
  }, [documentHandovers]);

  // 1. Fetch real-time subscriptions with resilient error handling and auto-reconnect
  useEffect(() => {
    let unsubscribeSupplies = () => {};
    let unsubscribeDocuments = () => {};
    let retryTimer: any = null;

    const setupSubscriptions = () => {
      unsubscribeSupplies();
      unsubscribeDocuments();

      const handleFirestoreError = (err: any) => {
        const errMsg = err?.message || String(err);
        if (errMsg.includes('Quota') || errMsg.includes('resource-exhausted') || err?.code === 'resource-exhausted') {
          console.warn("[Firestore] Daily free read quota reached. App is serving smoothly from local cache.");
        } else {
          console.warn("[Firestore] Connection notice: ", errMsg);
        }
        setLoading(false);

        // Schedule a silent retry in 60 seconds
        if (!retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            setupSubscriptions();
          }, 60000);
        }
      };

      try {
        unsubscribeSupplies = subscribeSuppliesRequests(
          (requests) => {
            setSuppliesRequests(requests);
            setLoading(false);
          },
          handleFirestoreError
        );

        unsubscribeDocuments = subscribeDocumentHandovers(
          (docs) => {
            setDocumentHandovers(docs);
            setLoading(false);
          },
          handleFirestoreError
        );
      } catch (err) {
        handleFirestoreError(err);
      }
    };

    setupSubscriptions();

    return () => {
      unsubscribeSupplies();
      unsubscribeDocuments();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  // Optimistic Handlers for Supplies Requests
  const handleAddSuppliesRequest = async (newReq: Omit<SuppliesRequest, 'id'>) => {
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const itemToAdd: SuppliesRequest = {
      id: tempId,
      ...newReq
    };
    setSuppliesRequests(prev => [itemToAdd, ...prev]);
    try {
      const realId = await addSuppliesRequest(newReq);
      if (realId) {
        setSuppliesRequests(prev => prev.map(item => item.id === tempId ? { ...item, id: realId } : item));
        return realId;
      }
      return tempId;
    } catch (e) {
      console.warn('Firestore write warning:', e);
      return tempId;
    }
  };

  const handleUpdateSuppliesRequest = async (id: string, updates: Partial<SuppliesRequest>) => {
    setSuppliesRequests(prev => prev.map(item => item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item));
    try {
      await updateSuppliesRequest(id, updates);
    } catch (e) {
      console.warn('Firestore update warning:', e);
    }
  };

  const handleDeleteSuppliesRequest = async (id: string) => {
    setSuppliesRequests(prev => prev.filter(item => item.id !== id));
    try {
      await deleteSuppliesRequest(id);
    } catch (e) {
      console.warn('Firestore delete warning:', e);
    }
  };

  // Optimistic Handlers for Documents
  const handleAddDocumentHandover = async (docEntry: Omit<DocumentHandover, 'id'>) => {
    const tempId = 'temp_doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const itemToAdd: DocumentHandover = {
      id: tempId,
      ...docEntry
    };
    setDocumentHandovers(prev => [itemToAdd, ...prev]);
    try {
      const realId = await addDocumentHandover(docEntry);
      if (realId) {
        setDocumentHandovers(prev => prev.map(item => item.id === tempId ? { ...item, id: realId } : item));
        return realId;
      }
      return tempId;
    } catch (e) {
      console.warn('Firestore doc write warning:', e);
      return tempId;
    }
  };

  const handleUpdateDocumentHandover = async (id: string, updates: Partial<DocumentHandover>) => {
    setDocumentHandovers(prev => prev.map(item => item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item));
    try {
      await updateDocumentHandover(id, updates);
    } catch (e) {
      console.warn('Firestore doc update warning:', e);
    }
  };

  const handleDeleteDocumentHandover = async (id: string) => {
    setDocumentHandovers(prev => prev.filter(item => item.id !== id));
    try {
      await deleteDocumentHandover(id);
    } catch (e) {
      console.warn('Firestore doc delete warning:', e);
    }
  };

  // Handle immediate local restore from backup file
  const handleLocalRestore = useCallback((newSupplies: SuppliesRequest[], newDocs: DocumentHandover[]) => {
    if (newSupplies && newSupplies.length > 0) {
      setSuppliesRequests(prev => {
        const map = new Map<string, SuppliesRequest>(prev.map(item => [item.id, item]));
        newSupplies.forEach(item => map.set(item.id, item));
        const merged = Array.from(map.values()).sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        try {
          localStorage.setItem('kaigo_supplies_cache', JSON.stringify(merged));
        } catch {}
        return merged;
      });
    }

    if (newDocs && newDocs.length > 0) {
      setDocumentHandovers(prev => {
        const map = new Map<string, DocumentHandover>(prev.map(item => [item.id, item]));
        newDocs.forEach(item => map.set(item.id, item));
        const merged = Array.from(map.values()).sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        try {
          localStorage.setItem('kaigo_docs_cache', JSON.stringify(merged));
        } catch {}
        return merged;
      });
    }

    setLoading(false);
  }, []);

  // 2. Count metrics for badges
  const uncontactedCount = suppliesRequests.filter(req => req.contactStatus === '未連絡').length;
  const pendingDocsCount = documentHandovers.filter(doc => doc.handoverStatus === '保管中').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      
      {/* Header with real-time stats & Data Management Buttons */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        uncontactedCount={uncontactedCount}
        pendingDocsCount={pendingDocsCount}
        onOpenDataSave={() => setShowDataSaveModal(true)}
        onOpenDataRestore={() => setShowDataRestoreModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-grow">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold">データベース同期中...</p>
          </div>
        ) : (
          <div>
            {activeTab === 'helper' && (
              <HelperRequestForm 
                onAddRequest={handleAddSuppliesRequest}
                allRequests={suppliesRequests}
              />
            )}
            
            {activeTab === 'office-supplies' && (
              <OfficeSuppliesAdmin 
                requests={suppliesRequests}
                onUpdateRequest={handleUpdateSuppliesRequest}
                onDeleteRequest={handleDeleteSuppliesRequest}
                onOpenDataSave={() => setShowDataSaveModal(true)}
                onOpenDataRestore={() => setShowDataRestoreModal(true)}
              />
            )}

            {activeTab === 'office-docs' && (
              <OfficeDocumentAdmin 
                documents={documentHandovers}
                onAddDocument={handleAddDocumentHandover}
                onUpdateDocument={handleUpdateDocumentHandover}
                onDeleteDocument={handleDeleteDocumentHandover}
                onOpenDataSave={() => setShowDataSaveModal(true)}
                onOpenDataRestore={() => setShowDataRestoreModal(true)}
              />
            )}
          </div>
        )}
      </main>

      {/* Data Save (Print & CSV/JSON Export) Modal */}
      <DataSaveModal 
        isOpen={showDataSaveModal}
        onClose={() => setShowDataSaveModal(false)}
        suppliesRequests={suppliesRequests}
        documentHandovers={documentHandovers}
      />

      {/* Data Restore Modal */}
      <DataRestoreModal 
        isOpen={showDataRestoreModal}
        onClose={() => setShowDataRestoreModal(false)}
        onLocalRestore={handleLocalRestore}
      />

      {/* Info footer for multiple devices instruction */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-xs text-center px-4">
        <div className="max-w-7xl mx-auto space-y-2">
          <p className="font-semibold text-slate-300">
            📱 複数デバイス（スマートフォンや複数のPC）で完全に同期されます！
          </p>
          <p className="max-w-2xl mx-auto text-slate-400 leading-relaxed">
            本アプリは クラウド型データベース (Firebase Firestore) を使用しているため、
            特別なDropboxやGoogleドライブへのファイルやり取りは必要ありません。
            複数の端末でこのURLを開くだけで、リアルタイムで双方向に同期されます。
          </p>
          <div className="pt-4 border-t border-slate-800 mt-4 flex flex-col sm:flex-row items-center justify-between text-slate-500 gap-2">
            <span>© 2026 利用者物品＆書類（受取） 連絡管理システム</span>
            <span className="flex items-center gap-1">
              <ClipboardList className="w-4 h-4 text-emerald-500" />
              利用者本位のケア環境の実現に向けて
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

