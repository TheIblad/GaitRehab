import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
    apiKey: "AIzaSyBW9h9MSaC7wdtUjwo-L2AvJrEJKIPBqvE",
    authDomain: "gait-rehabilitation.firebaseapp.com",
    projectId: "gait-rehabilitation",
    storageBucket: "gait-rehabilitation.firebasestorage.app",
    messagingSenderId: "497138447235",
    appId: "1:497138447235:web:45faa3ec3dcc0178dabcb6",
    measurementId: "G-7NK5L86XE6"
};

// Set up Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
let analytics = null;

// Initialize analytics only in browser environment
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { auth, db, storage, analytics };