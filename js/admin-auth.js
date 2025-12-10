import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function intentarLogin(email, password) {
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const user = cred.user;

        const ref = doc(db, "admin_users", user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) return false;
        if (!snap.data().activo) return false;

        localStorage.setItem("fe_admin_user", user.uid);
        return true;

    } catch (e) {
        console.error("Auth error:", e);
        return false;
    }
}

export function getCurrentUser() {
    return localStorage.getItem("fe_admin_user");
}
