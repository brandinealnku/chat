import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAWNTnXn2yNXv5KSfVYCW_LH5uVvGtx1TU",
  authDomain: "chatitsbad.firebaseapp.com",
  projectId: "chatitsbad",
  storageBucket: "chatitsbad.firebasestorage.app",
  messagingSenderId: "254399478035",
  appId: "1:254399478035:web:f7a07d1f33ef47a87e02e6",
  measurementId: "G-NX92YKEQJR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
