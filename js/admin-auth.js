// js/admin-auth.js
"use strict";

import { db } from "./firebase-config.js";
import { sha256Hex } from "./utils.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const COL_ADMIN = collection(db, "admin_users");

// Clave en localStorage para la sesión
const SESSION_KEY = "fe_admin_session";

/** Devuelve el usuario actual de sesión (o null) */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Guarda sesión en localStorage */
function saveSession(userObj) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
}

/** Limpia sesión */
export function logoutAdmin() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Login:
 *  - username: string (ej. "Anunez-adm")
 *  - password: texto plano que será hasheado en SHA‑256
 * Devuelve objeto { id, username, role } o null
 */
export async function intentarLogin(username, password) {
  const userNorm = username.trim();
  if (!userNorm || !password) return null;

  // 1) Buscar documento por username
  const q = query(COL_ADMIN, where("username", "==", userNorm));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const docSnap = snap.docs[0];
  const data = docSnap.data();

  if (data.disabled === true) {
    return null;
  }

  // 2) Calcular hash local del password
  const inputHash = await sha256Hex(password);

  // 3) Comparar con passwordHash en Firestore
  if (!data.passwordHash || data.passwordHash !== inputHash) {
    return null;
  }

  const userInfo = {
    id: docSnap.id,
    username: data.username,
    role: data.role || "Admin",
  };

  saveSession(userInfo);
  return userInfo;
}
