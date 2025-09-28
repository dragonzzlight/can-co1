// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCFc3eL4TubnvZKwPrbKu6bAJ6oSQwL1r4",
    authDomain: "canandco-23ded.firebaseapp.com",
    projectId: "canandco-23ded",
    storageBucket: "canandco-23ded.firebasestorage.app",
    messagingSenderId: "29311223599",
    appId: "1:29311223599:web:1e36dbb4eba294e1c303da"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);