export function toDateSafe(f) {
    if (!f) return new Date(0);
    if (typeof f.toDate === "function") return f.toDate();
    return new Date(f);
}

export function normalizar(text = "") {
    return text
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

/* Debounce para buscador */
export function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// Generar sessionId único por navegador para rastrear todo lo que un usuario hace en la sesión actual.
function generateSessionId() {
    return 'sess-' + crypto.randomUUID();
}

let sessionId = localStorage.getItem("fe_session_id");

if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem("fe_session_id", sessionId);
}

export { sessionId };
