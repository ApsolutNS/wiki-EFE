// js/utils.js
"use strict";

/** Normaliza texto para búsqueda */
export function normalizar(str) {
  return (str || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** Convierte objeto Firestore Timestamp o string ISO a Date seguro */
export function toDateSafe(value) {
  if (!value) return new Date(0);
  if (value.toDate) return value.toDate();
  if (typeof value === "string") return new Date(value);
  return new Date(value);
}

/** Debounce genérico */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** SHA‑256 en HEX (para comparar con passwordHash en admin_users) */
export async function sha256Hex(text) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
