import { 
  collection, 
  addDoc, 
  updateDoc, 
  setDoc,
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
  const isQuota = errInfo.error.includes('Quota') || errInfo.error.includes('resource-exhausted');
  if (isQuota) {
    console.warn('[Firestore Operation] Daily quota limit reached: ', errInfo.error);
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  throw new Error(JSON.stringify(errInfo));
}

// Collection references
const suppliesCollection = collection(db, 'supplies_requests');
const documentsCollection = collection(db, 'document_handovers');

/**
 * Real-time listener for supplies requests
 */
export function subscribeSuppliesRequests(
  callback: (requests: SuppliesRequest[]) => void,
  onError?: (error: any) => void
) {
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
  }, (error: any) => {
    const isQuota = error?.code === 'resource-exhausted' || error?.message?.includes('Quota limit') || error?.message?.includes('quota');
    if (isQuota) {
      console.warn('[Firestore] Supplies sync standby: daily read quota limit reached, using local data until reset.');
    } else {
      console.warn('[Firestore] Supplies sync notice: ', error?.message || error);
    }
    if (onError) {
      onError(error);
    }
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
export function subscribeDocumentHandovers(
  callback: (docs: DocumentHandover[]) => void,
  onError?: (error: any) => void
) {
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
  }, (error: any) => {
    const isQuota = error?.code === 'resource-exhausted' || error?.message?.includes('Quota limit') || error?.message?.includes('quota');
    if (isQuota) {
      console.warn('[Firestore] Documents sync standby: daily read quota limit reached, using local data until reset.');
    } else {
      console.warn('[Firestore] Documents sync notice: ', error?.message || error);
    }
    if (onError) {
      onError(error);
    }
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

/**
 * Bulk restore backup data into Firestore
 */
export async function restoreBackupData(
  supplies: SuppliesRequest[],
  documents: DocumentHandover[],
  onProgress?: (current: number, total: number) => void
): Promise<{ suppliesSuccess: number; docsSuccess: number; errors: string[] }> {
  const errors: string[] = [];
  let suppliesSuccess = 0;
  let docsSuccess = 0;
  const total = (supplies ? supplies.length : 0) + (documents ? documents.length : 0);
  let current = 0;

  if (supplies && supplies.length > 0) {
    for (const item of supplies) {
      try {
        const { id, ...data } = item;
        // Clean up data to conform to Firestore rules
        const cleanData: any = {
          createdAt: data.createdAt || new Date().toISOString(),
          userName: data.userName,
          helperName: data.helperName || '不明',
          selectedItems: data.selectedItems || [],
          otherDetails: data.otherDetails || '',
          status: data.status || '新規',
          urgency: data.urgency || '普通',
          contactStatus: data.contactStatus || '未連絡',
        };
        if (data.receiptDate) cleanData.receiptDate = data.receiptDate;
        if (data.officeStaff) cleanData.officeStaff = data.officeStaff;
        if (data.contactMethod) cleanData.contactMethod = data.contactMethod;
        if (data.updatedAt) cleanData.updatedAt = data.updatedAt;

        if (id && /^[a-zA-Z0-9_\-]+$/.test(id)) {
          await setDoc(doc(db, 'supplies_requests', id), cleanData);
        } else {
          await addDoc(suppliesCollection, cleanData);
        }
        suppliesSuccess++;
      } catch (e: any) {
        console.error('Failed to restore supply request:', item, e);
        errors.push(`物品依頼 (${item.userName || '名前なし'}): ${e?.message || '書き込みエラー'}`);
      }
      current++;
      onProgress?.(current, total);
    }
  }

  if (documents && documents.length > 0) {
    for (const item of documents) {
      try {
        const { id, ...data } = item;
        const cleanDoc: any = {
          createdAt: data.createdAt || new Date().toISOString(),
          userName: data.userName,
          documentName: data.documentName,
          familyNotified: Boolean(data.familyNotified),
          handoverStatus: data.handoverStatus || '保管中'
        };
        if (data.notificationDate) cleanDoc.notificationDate = data.notificationDate;
        if (data.notificationStaff) cleanDoc.notificationStaff = data.notificationStaff;
        if (data.handoverDate) cleanDoc.handoverDate = data.handoverDate;
        if (data.handoverStaff) cleanDoc.handoverStaff = data.handoverStaff;
        if (data.recipientName) cleanDoc.recipientName = data.recipientName;
        if (data.notes) cleanDoc.notes = data.notes;
        if (data.updatedAt) cleanDoc.updatedAt = data.updatedAt;

        if (id && /^[a-zA-Z0-9_\-]+$/.test(id)) {
          await setDoc(doc(db, 'document_handovers', id), cleanDoc);
        } else {
          await addDoc(documentsCollection, cleanDoc);
        }
        docsSuccess++;
      } catch (e: any) {
        console.error('Failed to restore doc handover:', item, e);
        errors.push(`書類受渡 (${item.userName || '名前なし'}): ${e?.message || '書き込みエラー'}`);
      }
      current++;
      onProgress?.(current, total);
    }
  }

  return { suppliesSuccess, docsSuccess, errors };
}

