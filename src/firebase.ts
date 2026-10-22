import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhqMvCodhe1z5bUfTTDCVUbspWNmkez9U",
  authDomain: "app-jucilea-valacio.firebaseapp.com",
  projectId: "app-jucilea-valacio",
  storageBucket: "app-jucilea-valacio.firebasestorage.app",
  messagingSenderId: "292039564903",
  appId: "1:292039564903:web:81b82e222ef629c1adbec2",
  measurementId: "G-RGZEMBQWMJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
