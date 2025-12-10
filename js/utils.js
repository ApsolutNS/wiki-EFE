/* ==========================================
   UTILS.JS — utilidades comunes
   ========================================== */

export function toDateSafe(ts) {
    if (!ts) return new Date(0);
    try {
        return ts.toDate ? ts.toDate() : new Date(ts);
    } catch {
        return new Date(0);
    }
}

export function normalizar(texto = "") {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

export function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
