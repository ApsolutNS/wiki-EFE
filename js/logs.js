import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { sessionId } from "./utils.js";

/**
 * Registra una acción administrativa (auditoría)
 * Se almacena en admin_logs con:
 * - articuloId
 * - accion: create | update | delete
 * - antes / despues
 * - usuarioEmail
 * - timestamp de Firestore
 * - sessionId del navegador
 * - userAgent
 */
async function registrarLog({ articuloId, accion, antes, despues, usuarioEmail }) {

    const log = {
        articuloId,
        accion,
        antes: antes || null,
        despues: despues || null,
        usuarioEmail: usuarioEmail || "desconocido",
        timestamp: serverTimestamp(),      // 🔥 Timestamp corporativo
        sessionId,
        userAgent: navigator.userAgent,
        ipHash: null                       // Se implementará en backend corporativo eventual
    };

    await addDoc(collection(db, "admin_logs"), log);
}

export { registrarLog };
