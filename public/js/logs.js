/* ==========================================
   LOGS.JS — Registro de acciones admin
   ========================================== */

import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } 
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const colLogs = collection(db, "admin_logs");

export async function registrarLog(data) {
    try {
        await addDoc(colLogs, {
            ...data,
            fecha: serverTimestamp()
        });
    } catch (err) {
        console.error("Error registrando log:", err);
    }
}
