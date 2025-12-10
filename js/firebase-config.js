import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBL1qT2tLfFTJ_f_3apv_sxKnn28u0nccs",
    authDomain: "financiera-efectiva-kb.firebaseapp.com",
    projectId: "financiera-efectiva-kb",
    storageBucket: "financiera-efectiva-kb.firebasestorage.app",
    messagingSenderId: "508397908196",
    appId: "1:508397908196:web:31d28a73ef56160963fcf1"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
