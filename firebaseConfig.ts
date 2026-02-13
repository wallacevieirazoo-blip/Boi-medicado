
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import * as firestore from "firebase/firestore";

// Destructure from firestore namespace to avoid "no exported member" errors in some environments
const { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} = firestore as any;

// Substitua pelas suas credenciais do console do Firebase
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

// Standard initialization for Firebase v9+ modular SDK
const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistent cache if supported
let db;
try {
  // Using initializeFirestore allows setting up the cache mechanism in modular SDK
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e) {
  console.warn("Firestore cache initialization failed, falling back to standard initialization", e);
  db = getFirestore(app);
}

const auth = getAuth(app);

export { db, auth };
