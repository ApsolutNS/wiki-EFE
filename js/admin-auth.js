import { db } from "./firebase-config.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ============================
   HASH SHA-256
============================ */
async function sha256(texto) {
    const data = new TextEncoder().encode(texto);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

/* ============================
   LOGIN AUTÉNTICO FIRESTORE
============================ */
export async function intentarLogin(username, password) {

    // Validación mínima
    if (!username || !password) return null;

    const passwordHash = await sha256(password);

    // Consulta Firestore
    const q = query(
        collection(db, "admin_users"),
        where("username", "==", username),
        where("passwordHash", "==", passwordHash),
        where("disabled", "==", false)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
        return null; // credenciales incorrectas
    }

    const userData = snap.docs[0].data();

    const user = {
        username: userData.username,
        role: userData.role || "admin",
        uid: snap.docs[0].id    // útil para permisos avanzados
    };

    // Guardar sesión segura
    localStorage.setItem("fe_admin_user", JSON.stringify(user));

    return user;
}

/* ============================
   OBTENER USUARIO AUTENTICADO
============================ */
export function getCurrentUser() {
    const saved = localStorage.getItem("fe_admin_user");
    if (!saved) return null;
    return JSON.parse(saved);
}

/* ============================
   LOGOUT
============================ */
export function logout() {
    localStorage.removeItem("fe_admin_user");
}
