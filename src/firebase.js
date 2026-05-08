import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyAz5MlTxsTuOTPN1ucLLvUm31s6DeCttDk",
  authDomain: "mansat-h.firebaseapp.com",
  projectId: "mansat-h",
  storageBucket: "mansat-h.firebasestorage.app",
  messagingSenderId: "725993254230",
  appId: "1:725993254230:web:1cd50124f852ecc9427af7"
};

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)