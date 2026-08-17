export type UrgencyType = '普通' | '至急';
export type StatusType = '無' | '残少' | '新規';
export type ContactMethodType = 'LINE' | '電話またはSMS' | 'LINE＆電話' | '';
export type ContactStatusType = '未連絡' | '連絡済' | '連絡したが返事がない';
export type HandoverStatusType = '保管中' | '受渡済';

export interface SuppliesCategory {
  id: string;
  name: string;
  items: string[];
}

export interface SelectedItems {
  [categoryName: string]: {
    [itemName: string]: boolean | string; // Boolean for standard checkboxes, string for details (e.g. sizes)
  };
}

export interface SuppliesRequest {
  id: string;
  createdAt: string; // ISO String or Date
  userName: string;  // 利用者名
  helperName: string; // 申請者名
  selectedItems: {
    category: string;
    items: string[];
  }[];
  otherDetails: string; // その他の品・詳細説明などのブランク欄
  status: StatusType; // 現状ステータス
  urgency: UrgencyType; // 緊急度
  
  // 事務所管理
  receiptDate?: string; // 受付日
  officeStaff?: string; // 事務所担当者名
  contactMethod?: ContactMethodType; // 連絡方法
  contactStatus: ContactStatusType; // 連絡ステータス
  updatedAt?: string;
}

export interface DocumentHandover {
  id: string;
  createdAt: string; // 到着日時/登録日時
  userName: string;  // 利用者名
  documentName: string; // 書類名・郵便物・貴重品内容
  
  familyNotified: boolean; // 家族連絡済かどうか
  notificationDate?: string; // 連絡日
  notificationStaff?: string; // 連絡担当者名
  
  handoverStatus: HandoverStatusType; // 保管中 | 受渡済
  handoverDate?: string; // 受渡日
  handoverStaff?: string; // 受渡担当者名
  recipientName?: string; // 受け取った家族名 / 備考
  notes?: string; // 備考
  updatedAt?: string;
}
