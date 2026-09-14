import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import HelperRequestForm from './components/HelperRequestForm';
import OfficeSuppliesAdmin from './components/OfficeSuppliesAdmin';
import OfficeDocumentAdmin from './components/OfficeDocumentAdmin';
import DataManagementModal from './components/DataManagementModal';
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

  const [showDataModal, setShowDataModal] = useState(false);

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

  // 1. Fetch real-time subscriptions with error handling
  useEffect(() => {
    let unsubscribeSupplies = () => {};
    let unsubscribeDocuments = () => {};

    const handleFirestoreError = (err: any) => {
      console.error("Firestore connection issue: ", err);
      setLoading(false);
    };

    try {
      // Listen to supplies requests in real-time
      unsubscribeSupplies = subscribeSuppliesRequests(
        (requests) => {
          setSuppliesRequests(requests);
          setLoading(false);
        },
        handleFirestoreError
      );

      // Listen to document handovers in real-time
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

    return () => {
      unsubscribeSupplies();
      unsubscribeDocuments();
    };
  }, []);

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
      
      {/* Header with real-time stats & Data Management Button */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        uncontactedCount={uncontactedCount}
        pendingDocsCount={pendingDocsCount}
        onOpenDataManagement={() => setShowDataModal(true)}
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
                onAddRequest={addSuppliesRequest}
                allRequests={suppliesRequests}
              />
            )}
            
            {activeTab === 'office-supplies' && (
              <OfficeSuppliesAdmin 
                requests={suppliesRequests}
                onUpdateRequest={updateSuppliesRequest}
                onDeleteRequest={deleteSuppliesRequest}
                onOpenDataManagement={() => setShowDataModal(true)}
              />
            )}

            {activeTab === 'office-docs' && (
              <OfficeDocumentAdmin 
                documents={documentHandovers}
                onAddDocument={addDocumentHandover}
                onUpdateDocument={updateDocumentHandover}
                onDeleteDocument={deleteDocumentHandover}
                onOpenDataManagement={() => setShowDataModal(true)}
              />
            )}
          </div>
        )}
      </main>

      {/* Data Management (Backup & Restore) Modal */}
      <DataManagementModal 
        isOpen={showDataModal}
        onClose={() => setShowDataModal(false)}
        suppliesRequests={suppliesRequests}
        documentHandovers={documentHandovers}
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

