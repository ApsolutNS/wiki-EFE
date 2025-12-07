import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let CURRENT_USER = null;

/* ======================
   HASH SHA-256
====================== */
async function sha256(texto) {
    const data = new TextEncoder().encode(texto);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

/* ======================
   LOGIN CONTRA firestore
====================== */
export async function intentarLogin(username, password) {

    const hash = await sha256(password);
    const snap = await getDocs(collection(db, "admin_users"));

    let userMatch = null;

    snap.forEach(doc => {
        const data = doc.data();
        if (data.username === username && data.passwordHash === hash) {
            userMatch = {
                username: data.username,
                role: data.role || "admin",
            };
        }
    });

    if (userMatch) {
        CURRENT_USER = userMatch;
        localStorage.setItem("fe_admin_user", JSON.stringify(userMatch));
        return userMatch;
    }

    return null;
}

/* ======================
   Obtener usuario actual
====================== */
export function getCurrentUser() {
    if (CURRENT_USER) return CURRENT_USER;

    const saved = localStorage.getItem("fe_admin_user");
    if (saved) {
        CURRENT_USER = JSON.parse(saved);
        return CURRENT_USER;
    }

    return null;
}

/* ======================
   Logout
====================== */
export function logout() {
    CURRENT_USER = null;
    localStorage.removeItem("fe_admin_user");
}
