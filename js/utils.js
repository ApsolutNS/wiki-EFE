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
