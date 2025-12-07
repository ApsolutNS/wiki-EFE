// ======================================================
// LOGS DE AUDITORÍA - EFECTIV-WIKI ADMIN
// ======================================================

import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { sessionId } from "./utils.js";

/**
 * Registra una acción administrativa de auditoría
 * Las acciones pueden ser:
 * - login
 * - create
 * - update
 * - delete
 *
 * Cada log incluye:
 *  - articuloId        → null si no aplica (login)
 *  - accion            → string
 *  - antes             → estado anterior del contenido
 *  - despues           → estado nuevo
 *  - usuarioEmail      → identificador del usuario admin
 *  - timestamp         → serverTimestamp()
 *  - sessionId         → ID persistente por navegador
 *  - userAgent         → info del navegador
 *  - ipHash            → reservado para backend
 */

export async function registrarLog({ articuloId = null, accion, antes = null, despues = null, usuarioEmail = "desconocido" }) {
    try {
        const log = {
            articuloId,
            accion,
            antes: antes || null,
            despues: despues || null,
            usuarioEmail,
            timestamp: serverTimestamp(),
            sessionId,
            userAgent: navigator?.userAgent || "unknown",
            ipHash: null // reservado para backend
        };

        await addDoc(collection(db, "admin_logs"), log);

        console.log("✔ LOG registrado:", accion, articuloId || "");
        return true;

    } catch (error) {
        console.error("❌ Error registrando LOG:", error);
        return false;
    }
}
