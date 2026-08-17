import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "modular-plateau-7gtt6",
  appId: "1:157406072124:web:13cb76d62239e4cd6ce239",
  apiKey: "AIzaSyD7p4Ex809nnQRN0zIxjek0REhB303E0L0",
  authDomain: "modular-plateau-7gtt6.firebaseapp.com",
  storageBucket: "modular-plateau-7gtt6.firebasestorage.app",
  messagingSenderId: "157406072124",
  measurementId: ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific databaseId provisioned by AI Studio and configure to ignore undefined fields
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, "ai-studio-0871ee80-cbbc-4850-9cbd-57dd5d6a854f");
