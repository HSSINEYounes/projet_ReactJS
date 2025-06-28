// firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "@firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBXbwn5G47Py80Xq6Ll0gXlrSo5sDa48NQ",
  authDomain: "stage4eme-116ba.firebaseapp.com",
  projectId: "stage4eme-116ba",
  storageBucket: "stage4eme-116ba.firebasestorage.app",
  messagingSenderId: "306715594364",
  appId: "1:306715594364:web:5630d7958bba7c3bd943f9",
  databaseURL: "https://stage4eme-116ba-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);

export const firestore = getFirestore(app);
export const db = getDatabase(app);

const storage = getStorage(app);

export { storage };
export const auth = getAuth(app);
export default app;
