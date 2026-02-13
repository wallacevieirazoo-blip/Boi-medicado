// --- IMPORTAÇÕES CERTAS (V9) ---

import { initializeApp } from "firebase/app";

import { getFirestore } from "firebase/firestore";

import { getAuth } from "firebase/auth";



// Suas chaves do Firebase (O App usa essas variáveis para conectar)

const firebaseConfig = {

  apiKey: "AIzaSyAsFWNokJfTXd85gi2YPrtNF4MHC6ppb1Q", // <--- IMPORTANTE: Verifique se sua chave está aqui

  authDomain: "boi-medicado.firebaseapp.com",

  projectId: "boi-medicado",

  storageBucket: "boi-medicado.appspot.com",

  messagingSenderId: "739691554979",

  appId: "1:739691554979:web:c2e315e4c4a096abe3b716"

};



// Inicializa o Firebase

const app = initializeApp(firebaseConfig);



// Exporta as ferramentas para o resto do app usar

export const db = getFirestore(app);

export const auth = getAuth(app);