import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyCcAdZGtJ1D6oyCI3ryA8TGZ5jUsn3nJyk",
  authDomain: "gk-platform-3f57b.firebaseapp.com",
  projectId: "gk-platform-3f57b",
  storageBucket: "gk-platform-3f57b.firebasestorage.app",
  messagingSenderId: "530490849065",
  appId: "1:530490849065:web:2d225fbbb021f705822938",
  measurementId: "G-8WXGQ3V0KR",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
