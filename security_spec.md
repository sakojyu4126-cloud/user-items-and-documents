# Security Specification - Util Supplies & Document Handover Management

## 1. Data Invariants

Our application is a multi-device shared environment where helpers and office staff operate on shared data collections without individual user accounts. Thus, access control is governed by strict structure validation, size limits, and immutability controls to prevent spam, storage abuse ("Denial of Wallet"), and data corruption.

### SuppliesRequest Collection (`/supplies_requests/{requestId}`)
- **Immutability**: `createdAt` and `userName` must never be modified once created.
- **Type & Range Enforcements**:
  - `userName` must be a string of length 1 to 100.
  - `helperName` must be a string of length 1 to 100.
  - `otherDetails` must be a string of length 0 to 1000.
  - `status` must be one of: `"無"`, `"残少"`, `"新規"`.
  - `urgency` must be one of: `"普通"`, `"至急"`.
  - `contactStatus` must be one of: `"未連絡"`, `"連絡済"`, `"連絡したが返事がない"`.
  - `contactMethod` (if present) must be one of: `"LINE"`, `"電話またはSMS"`, `"LINE＆電話"`, `""`.
  - `officeStaff` (if present) must be a string of length 0 to 100.
  - `receiptDate` (if present) must be a string of length 0 to 20.
  - `selectedItems` must be a list of maps containing `category` and `items` (which is a list of strings). The list must have a maximum size of 20 to prevent infinite-growth array attacks.

### DocumentHandover Collection (`/document_handovers/{documentId}`)
- **Immutability**: `createdAt` and `userName` must never be modified once created.
- **Type & Range Enforcements**:
  - `userName` must be a string of length 1 to 100.
  - `documentName` must be a string of length 1 to 200.
  - `familyNotified` must be a boolean.
  - `notificationDate` (if present) must be a string of length 0 to 20.
  - `notificationStaff` (if present) must be a string of length 0 to 100.
  - `handoverStatus` must be one of: `"保管中"`, `"受渡済"`.
  - `handoverDate` (if present) must be a string of length 0 to 20.
  - `handoverStaff` (if present) must be a string of length 0 to 100.
  - `recipientName` (if present) must be a string of length 0 to 100.
  - `notes` (if present) must be a string of length 0 to 1000.

---

## 2. The "Dirty Dozen" Payloads

The following malicious or malformed payloads must be strictly rejected (`PERMISSION_DENIED`) by Firestore security rules.

### Payload 1: SuppliesRequest with a massive userName (Storage Abuse / DoW attack)
```json
{
  "createdAt": "2026-07-05T12:00:00.000Z",
  "userName": "A...[Repeated 10,000 times]...A",
  "helperName": "山田 美咲",
  "selectedItems": [],
  "otherDetails": "",
  "status": "残少",
  "urgency": "普通",
  "contactStatus": "未連絡"
}
```

### Payload 2: SuppliesRequest with invalid status enum value
```json
{
  "createdAt": "2026-07-05T12:00:00.000Z",
  "userName": "佐藤 太郎",
  "helperName": "山田 美咲",
  "selectedItems": [],
  "otherDetails": "",
  "status": "大量にほしい",
  "urgency": "普通",
  "contactStatus": "未連絡"
}
```

### Payload 3: SuppliesRequest with invalid urgency enum value
```json
{
  "createdAt": "2026-07-05T12:00:00.000Z",
  "userName": "佐藤 太郎",
  "helperName": "山田 美咲",
  "selectedItems": [],
  "otherDetails": "",
  "status": "新規",
  "urgency": "すぐに持ってきて",
  "contactStatus": "未連絡"
}
```

### Payload 4: SuppliesRequest missing required field on creation
```json
{
  "createdAt": "2026-07-05T12:00:00.000Z",
  "userName": "佐藤 太郎",
  "selectedItems": [],
  "otherDetails": "",
  "status": "新規",
  "urgency": "普通",
  "contactStatus": "未連絡"
}
```

### Payload 5: SuppliesRequest updating immutable `createdAt` field
```json
// Existing Document:
// { "createdAt": "2026-07-05T12:00:00.000Z", "userName": "佐藤 太郎", ... }
// Malicious Update:
{
  "createdAt": "2026-08-01T00:00:00.000Z"
}
```

### Payload 6: DocumentHandover with massive documentName
```json
{
  "createdAt": "2026-07-05T12:00:00.000Z",
  "userName": "佐藤 太郎",
  "documentName": "B...[Repeated 5,000 times]...B",
  "familyNotified": false,
  "handoverStatus": "保管中"
}
```

### Payload 7: DocumentHandover with invalid handoverStatus enum value
```json
{
  "createdAt": "2026-07-05T12:00:00.000Z",
  "userName": "佐藤 太郎",
  "documentName": "保険証",
  "familyNotified": false,
  "handoverStatus": "どこかに消えた"
}
```

### Payload 8: DocumentHandover with familyNotified as string instead of boolean (Type violation)
```json
{
  "createdAt": "2026-07-05T12:00:00.000Z",
  "userName": "佐藤 太郎",
  "documentName": "保険証",
  "familyNotified": "true",
  "handoverStatus": "保管中"
}
```

### Payload 9: DocumentHandover updating immutable `userName` field after creation
```json
// Existing Document:
// { "userName": "佐藤 太郎", "documentName": "保険証", ... }
// Malicious Update:
{
  "userName": "鈴木 一郎"
}
```

### Payload 10: SuppliesRequest updating non-whitelisted "Ghost Field" (Privilege escalation / Shadow field)
```json
// Existing Document:
// { "userName": "佐藤 太郎", ... }
// Malicious Update:
{
  "isAdmin": true
}
```

### Payload 11: DocumentHandover updating non-whitelisted "Ghost Field"
```json
// Existing Document:
// { "userName": "佐藤 太郎", ... }
// Malicious Update:
{
  "isVerified": true
}
```

### Payload 12: SuppliesRequest ID with invalid special characters (ID Poisoning Guard)
```json
// Creating with a malicious ID:
// Path: /supplies_requests/$$$invalid-id$$$
{
  "createdAt": "2026-07-05T12:00:00.000Z",
  "userName": "佐藤 太郎",
  "helperName": "山田 美咲",
  "selectedItems": [],
  "otherDetails": "",
  "status": "残少",
  "urgency": "普通",
  "contactStatus": "未連絡"
}
```

---

## 3. The Test Runner Reference

Because we operate in a multi-device public setup, our test assertions verify that any read/write request matches the strict structural, size, and enum assertions of the respective schemas.

We will write `firestore.rules` to enforce these constraints robustly.
