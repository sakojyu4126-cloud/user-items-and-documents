import { useState, useEffect } from 'react';
import Header from './components/Header';
import HelperRequestForm from './components/HelperRequestForm';
import OfficeSuppliesAdmin from './components/OfficeSuppliesAdmin';
import OfficeDocumentAdmin from './components/OfficeDocumentAdmin';
import { SuppliesRequest, DocumentHandover } from './types';
import { 
  subscribeSuppliesRequests, 
  addSuppliesRequest, 
  updateSuppliesRequest, 
  deleteSuppliesRequest,
  subscribeDocumentHandovers, 
  addDocumentHandover, 
  updateDocumentHandover,
  deleteDocumentHandover,
  seedSampleDataIfEmpty
} from './lib/firebaseUtils';
import { ClipboardList, Users, ArrowUpRight, HelpCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'helper' | 'office-supplies' | 'office-docs'>('helper');
  const [suppliesRequests, setSuppliesRequests] = useState<SuppliesRequest[]>([]);
  const [documentHandovers, setDocumentHandovers] = useState<DocumentHandover[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch real-time subscriptions and seed initial sample data
  useEffect(() => {
    let unsubscribeSupplies = () => {};
    let unsubscribeDocuments = () => {};

    async function initDatabase() {
      try {
        // Seed database if empty so they have realistic records to play with
        await seedSampleDataIfEmpty();
        
        // Listen to supplies requests in real-time
        unsubscribeSupplies = subscribeSuppliesRequests((requests) => {
          setSuppliesRequests(requests);
          setLoading(false);
        });

        // Listen to document handovers in real-time
        unsubscribeDocuments = subscribeDocumentHandovers((docs) => {
          setDocumentHandovers(docs);
        });
      } catch (err) {
        console.error("Failed to initialize database: ", err);
        setLoading(false);
      }
    }

    initDatabase();

    return () => {
      unsubscribeSupplies();
      unsubscribeDocuments();
    };
  }, []);

  // 2. Count metrics for badges
  const uncontactedCount = suppliesRequests.filter(req => req.contactStatus === '未連絡').length;
  const pendingDocsCount = documentHandovers.filter(doc => doc.handoverStatus === '保管中').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      
      {/* Header with real-time stats */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        uncontactedCount={uncontactedCount}
        pendingDocsCount={pendingDocsCount}
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
              />
            )}

            {activeTab === 'office-docs' && (
              <OfficeDocumentAdmin 
                documents={documentHandovers}
                onAddDocument={addDocumentHandover}
                onUpdateDocument={updateDocumentHandover}
                onDeleteDocument={deleteDocumentHandover}
              />
            )}
          </div>
        )}
      </main>

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
