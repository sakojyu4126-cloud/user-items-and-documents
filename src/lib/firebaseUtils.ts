import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { SuppliesRequest, DocumentHandover } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Handle Firestore error and throw a JSON-serialized FirestoreErrorInfo string
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Collection references
const suppliesCollection = collection(db, 'supplies_requests');
const documentsCollection = collection(db, 'document_handovers');

/**
 * Real-time listener for supplies requests
 */
export function subscribeSuppliesRequests(callback: (requests: SuppliesRequest[]) => void) {
  const q = query(suppliesCollection, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const requests: SuppliesRequest[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
      } as SuppliesRequest);
    });
    callback(requests);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'supplies_requests');
  });
}

/**
 * Add a new supplies request
 */
export async function addSuppliesRequest(request: Omit<SuppliesRequest, 'id'>) {
  try {
    const docRef = await addDoc(suppliesCollection, request);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'supplies_requests');
  }
}

/**
 * Update an existing supplies request
 */
export async function updateSuppliesRequest(id: string, updates: Partial<SuppliesRequest>) {
  try {
    const docRef = doc(db, 'supplies_requests', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `supplies_requests/${id}`);
  }
}

/**
 * Delete an existing supplies request
 */
export async function deleteSuppliesRequest(id: string) {
  try {
    const docRef = doc(db, 'supplies_requests', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `supplies_requests/${id}`);
  }
}

/**
 * Real-time listener for document/valuable handovers
 */
export function subscribeDocumentHandovers(callback: (docs: DocumentHandover[]) => void) {
  const q = query(documentsCollection, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const docs: DocumentHandover[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      docs.push({
        id: doc.id,
        ...data,
      } as DocumentHandover);
    });
    callback(docs);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'document_handovers');
  });
}

/**
 * Add a new document handover entry
 */
export async function addDocumentHandover(documentEntry: Omit<DocumentHandover, 'id'>) {
  try {
    const docRef = await addDoc(documentsCollection, documentEntry);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'document_handovers');
  }
}

/**
 * Update an existing document handover entry
 */
export async function updateDocumentHandover(id: string, updates: Partial<DocumentHandover>) {
  try {
    const docRef = doc(db, 'document_handovers', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `document_handovers/${id}`);
  }
}

/**
 * Delete an existing document handover entry
 */
export async function deleteDocumentHandover(id: string) {
  try {
    const docRef = doc(db, 'document_handovers', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `document_handovers/${id}`);
  }
}

/**
 * Seed sample data if collections are empty
 */
export async function seedSampleDataIfEmpty() {
  try {
    let suppliesSnapshot;
    try {
      suppliesSnapshot = await getDocs(suppliesCollection);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'supplies_requests');
    }

    if (suppliesSnapshot.empty) {
      console.log("Seeding initial sample supplies requests...");
      const sampleRequests: Omit<SuppliesRequest, 'id'>[] = [
        {
          createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), // 4 hours ago
          userName: "佐藤 太郎",
          helperName: "山田 美咲",
          selectedItems: [
            { category: "① 衛生用品", items: ["尿取りパット（4回～6回）", "リハビリパンツ（Ｍ）"] },
            { category: "② 日用品", items: ["液体洗剤", "ティッシュ"] }
          ],
          otherDetails: "リハビリパンツは2パック、洗剤は本体をお願いします。",
          status: "残少",
          urgency: "普通",
          contactStatus: "未連絡"
        },
        {
          createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // 1 day ago
          userName: "鈴木 一郎",
          helperName: "田中 健太",
          selectedItems: [
            { category: "① 衛生用品", items: ["PVC手袋（介護用使い捨て手袋）", "マスク"] },
            { category: "④ 寝具", items: ["ラバーシーツ（ロング）"] }
          ],
          otherDetails: "ラバーシーツは破れがあったため交換用です。",
          status: "無",
          urgency: "至急",
          receiptDate: "2026-07-04",
          officeStaff: "高橋 玲子",
          contactMethod: "LINE＆電話",
          contactStatus: "連絡済"
        }
      ];

      for (const req of sampleRequests) {
        try {
          await addDoc(suppliesCollection, req);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'supplies_requests');
        }
      }
    }

    let docsSnapshot;
    try {
      docsSnapshot = await getDocs(documentsCollection);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'document_handovers');
    }

    if (docsSnapshot.empty) {
      console.log("Seeding initial sample document handovers...");
      const sampleDocs: Omit<DocumentHandover, 'id'>[] = [
        {
          createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), // 8 hours ago
          userName: "佐藤 太郎",
          documentName: "後期高齢者医療被保険者証（重要書留）",
          familyNotified: true,
          notificationDate: "2026-07-05",
          notificationStaff: "高橋 玲子",
          handoverStatus: "保管中"
        },
        {
          createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), // 3 days ago
          userName: "鈴木 一郎",
          documentName: "特別養護老人ホーム契約書控え（貴重品）",
          familyNotified: true,
          notificationDate: "2026-07-02",
          notificationStaff: "高橋 玲子",
          handoverStatus: "受渡済",
          handoverDate: "2026-07-03",
          handoverStaff: "鈴木 次郎",
          recipientName: "長男 鈴木 茂（受領サイン確認）",
          notes: "本人が署名捺印済みの書類をお渡し完了しました。"
        }
      ];

      for (const docEntry of sampleDocs) {
        try {
          await addDoc(documentsCollection, docEntry);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'document_handovers');
        }
      }
    }
  } catch (error) {
    console.error("Error seeding sample data: ", error);
    throw error;
  }
}
