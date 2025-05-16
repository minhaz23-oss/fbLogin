
import { initializeApp,getApp,getApps } from "firebase/app";
import {getAuth} from "firebase/auth"
import {getFirestore} from "firebase/firestore"



const firebaseConfig = {
  apiKey: "AIzaSyBub_28QezHWVJng3Eurhx2yZtFZErQdUE",
  authDomain: "test-pro-2bc2a.firebaseapp.com",
  projectId: "test-pro-2bc2a",
  storageBucket: "test-pro-2bc2a.firebasestorage.app",
  messagingSenderId: "412105094385",
  appId: "1:412105094385:web:4bab0fc3caf3e9d07ba550",
  measurementId: "G-H8T8W2B1YC"
};


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
