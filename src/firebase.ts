import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhH6LY-cz08cUNVR2S115HbTpVzs-Rqmo",
  authDomain: "si-rekap.firebaseapp.com",
  projectId: "si-rekap",
  storageBucket: "si-rekap.firebasestorage.app",
  messagingSenderId: "260159645931",
  appId: "1:260159645931:web:4ac3cfef1dbd0fe8cff6ae",
  measurementId: "G-XCVR3KWHCQ"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
