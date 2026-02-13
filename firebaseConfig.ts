import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAsFWNokJfTXd85gi2YPrtNF4MHC6ppb1Q", // <--- IMPORTANTE: Cole sua chave 'AIza...' aqui dentro das aspas!
  authDomain: "boi-medicado.firebaseapp.com",
  projectId: "boi-medicado",
  storageBucket: "boi-medicado.appspot.com",
  messagingSenderId: "739691554979",
  appId: "1:739691554979:web:c2e315e4c4a096abe3b716"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);