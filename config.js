import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD2RtVGoVOe7vJzWYa4uDMT686DmQ17c74",
  authDomain: "camino-c4b19.firebaseapp.com",
  projectId: "camino-c4b19",
  storageBucket: "camino-c4b19.firebasestorage.app",
  messagingSenderId: "902103592340",
  appId: "1:902103592340:web:5d9f57a7771335120a7381"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
auth.languageCode = "es"; // correos de Firebase en español
