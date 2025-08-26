// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC8fzNJ-uR-IVCMwLmlfw8pp_9jel9Q2fc",
  authDomain: "clinic-management-88007.firebaseapp.com",
  databaseURL: "https://clinic-management-88007-default-rtdb.firebaseio.com",
  projectId: "clinic-management-88007",
  storageBucket: "clinic-management-88007.firebasestorage.app",
  messagingSenderId: "496809534136",
  appId: "1:496809534136:web:26593a97ecb4e42dde4a4d",
  measurementId: "G-G7TPZFM16F"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
