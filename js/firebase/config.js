// This file serves as a local template.
// When running server.js, requests to /js/firebase/config.js are intercepted 
// and dynamic configurations containing server .env parameters are injected.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCm9nhx6TCndp_zGJ6LjfdMmYMMoIX4Rdk",
  authDomain: "carboncompass-98daf.firebaseapp.com",
  projectId: "carboncompass-98daf",
  storageBucket: "carboncompass-98daf.firebasestorage.app",
  messagingSenderId: "1040351927857",
  appId: "1:1040351927857:web:443f1960f17e27b5bbff10"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider, browserLocalPersistence, setPersistence };
