// Firebase Configuration provided by user
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAQdrBW8AqTdsJ_j0X-ABeNWvvIFAWmOYw",
  authDomain: "studio-2579646674-33d0d.firebaseapp.com",
  projectId: "studio-2579646674-33d0d",
  storageBucket: "studio-2579646674-33d0d.firebasestorage.app",
  messagingSenderId: "22103530324",
  appId: "1:22103530324:web:703d4d2526f94b306d06c1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
