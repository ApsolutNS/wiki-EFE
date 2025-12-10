/* =====================================================
   ADMIN-AUTH.JS (SHA-256 Login)
   ===================================================== */

import { db } from "./firebase-config.js";
import { sha256 } from "./utils.js";
import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const colAdmins = collection(db, "admin_users");

/* ================================
   LEER SESIÓN
   ================================ */
export function getCurrentUser() {
    const raw = sessionStorage.getItem("fe_admin_user");
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/* ================================
   INTENTAR LOGIN
   ================================ */
export async function intentarLogin(usuario, contraseña) {
    const passHash = await sha256(contraseña);

    const snap = await getDocs(colAdmins);

    const lista = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
    }));

    const match = lista.find(
        a => a.username === usuario && a.passwordHash === passHash
    );

    if (!match) return false;

    sessionStorage.setItem(
        "fe_admin_user",
        JSON.stringify({ username: usuario })
    );

    return true;
}
