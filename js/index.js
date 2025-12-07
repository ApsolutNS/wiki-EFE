import { db } from "./firebase-config.js";
import { toDateSafe, normalizar, debounce } from "./utils.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ================== ELEMENTOS DEL DOM ================== */
const searchBar        = document.getElementById("searchBar");
const categoriaSelect  = document.getElementById("categoriaSelect");
const sortSelect       = document.getElementById("sortSelect");
const resultsEl        = document.getElementById("results");
const topEl            = document.getElementById("topResults");
const historyBox       = document.getElementById("historyBox");
const paginationEl     = document.getElementById("pagination");
const infoResultadosEl = document.getElementById("infoResultados");
const infoOrdenEl      = document.getElementById("infoOrden");
const btnAdmin         = document.getElementById("btnAdmin");
const modal            = document.getElementById("modal");
const modalTitle       = document.getElementById("modalTitle");
const modalCategory    = document.getElementById("modalCategory");
const modalContent     = document.getElementById("modalContent");
const closeModal       = document.getElementById("closeModal");

/* ================== ESTADO ================== */
let articulosAll = [];
let articulosFiltrados = [];
let paginaActual = 1;
const POR_PAGINA = 12;

let criterioOrden = "recientes";
let filtroCategoria = "todas";

/* ================== CARGAR ARTÍCULOS ================== */
async function cargarArticulos() {
    try {
        const snap = await getDocs(collection(db, "articulos"));

        articulosAll = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(a => a.visibleAgentes !== false);

        renderRecomendados();
        aplicarFiltrosYBusqueda();
    } catch (e) {
        console.error("Error cargando artículos:", e);
    }
}

/* ================== RECOMENDADOS ================== */
function renderRecomendados() {
    const recomendados = [...articulosAll]
        .sort((a, b) => {
            const d = (b.destacado === true) - (a.destacado === true);
            return d !== 0 ? d : toDateSafe(b.fecha) - toDateSafe(a.fecha);
        })
        .slice(0, 4);

    renderResults(recomendados, topEl);
}

/* ================== FILTROS Y BÚSQUEDA ================== */
function aplicarFiltrosYBusqueda() {
    const q = normalizar(searchBar.value.trim());

    const base = articulosAll.filter(a =>
        filtroCategoria === "todas" ? true : a.categoria === filtroCategoria
    );

    if (!q) {
        articulosFiltrados = ordenarLista(base);
    } else {
        articulosFiltrados = base
            .map(a => {
                let score = 0;
                if (normalizar(a.titulo).includes(q)) score += 5;
                if (normalizar(a.resumen).includes(q)) score += 3;
                if (normalizar(a.categoria).includes(q)) score += 2;
                if (normalizar(a.contenido).includes(q)) score += 1;
                return { ...a, score };
            })
            .filter(a => a.score > 0)
            .sort((a, b) => b.score - a.score);
    }

    paginaActual = 1;
    renderPagina();
}

/* ================== ORDENAR LISTA ================== */
function ordenarLista(lista) {
    const arr = [...lista];

    if (criterioOrden === "vistas") {
        return arr.sort((a, b) => (b.vistas || 0) - (a.vistas || 0));
    }

    if (criterioOrden === "destacados") {
        return arr.sort(
            (a, b) =>
                (b.destacado === true) - (a.destacado === true) ||
                toDateSafe(b.fecha) - toDateSafe(a.fecha)
        );
    }

    // Más recientes primero
    return arr.sort((a, b) => toDateSafe(b.fecha) - toDateSafe(a.fecha));
}

/* ================== RENDER PÁGINA ================== */
function renderPagina() {
    const total = articulosFiltrados.length;

    if (total === 0) {
        resultsEl.innerHTML = "<p>No hay resultados.</p>";
        paginationEl.innerHTML = "";
        infoResultadosEl.textContent = "Mostrando 0 resultados.";
        infoOrdenEl.textContent = "";
        return;
    }

    const totalPaginas = Math.ceil(total / POR_PAGINA);
    const inicio = (paginaActual - 1) * POR_PAGINA;
    const paginados = articulosFiltrados.slice(inicio, inicio + POR_PAGINA);

    renderResults(paginados, resultsEl);

    infoResultadosEl.textContent = `Mostrando ${inicio + 1}–${Math.min(
        inicio + POR_PAGINA,
        total
    )} de ${total} artículos.`;

    infoOrdenEl.textContent = searchBar.value.trim()
        ? "Ordenado por relevancia de búsqueda."
        : criterioOrden === "recientes"
        ? "Ordenado por más recientes."
        : criterioOrden === "vistas"
        ? "Ordenado por más vistos."
        : "Ordenado por destacados.";

    renderPagination(totalPaginas);
}

/* ================== RENDER TARJETAS ================== */
function renderResults(items, target) {
    target.innerHTML = items
        .map(
            a => `
        <div class="card" data-id="${a.id}">
            <div class="card-title">${a.titulo}</div>

            <div class="card-meta-row">
                <div class="card-category">${a.categoria}</div>
            </div>

            <div class="card-resumen">${a.resumen}</div>
        </div>
    `
        )
        .join("");

    [...target.querySelectorAll(".card")].forEach(card => {
        card.addEventListener("click", () => abrirArticulo(card.dataset.id));
    });
}

/* ================== PAGINACIÓN ================== */
function renderPagination(totalPaginas) {
    if (totalPaginas <= 1) {
        paginationEl.innerHTML = "";
        return;
    }

    let html = "";
    for (let p = 1; p <= totalPaginas; p++) {
        html += `
            <button 
                class="page-btn ${p === paginaActual ? "active" : ""}" 
                data-page="${p}"
            >
                ${p}
            </button>
        `;
    }

    paginationEl.innerHTML = html;

    [...paginationEl.querySelectorAll(".page-btn")].forEach(btn => {
        btn.addEventListener("click", () => {
            paginaActual = parseInt(btn.dataset.page, 10);
            renderPagina();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    });
}

/* ================== MODAL ================== */
function abrirArticulo(id) {
    const art = articulosAll.find(a => a.id === id);
    if (!art) return;

    modalTitle.textContent = art.titulo || "";
    modalCategory.textContent = art.categoria || "";

    // 🔒 Sanitización fuerte con DOMPurify
    modalContent.innerHTML = DOMPurify.sanitize(art.contenido || "", {
        USE_PROFILES: { html: true },
        ALLOWED_TAGS: [
            "p", "b", "strong", "i", "u", "em", "br",
            "ul", "ol", "li",
            "span", "div",
            "h1", "h2", "h3", "h4", "h5",
            "table", "thead", "tbody", "tr", "th", "td",
            "code", "pre",
            "a"
        ],
        ALLOWED_ATTR: ["class", "href", "target", "rel"],
        ALLOW_DATA_ATTR: false,
        FORBID_TAGS: ["style", "script", "svg", "math", "iframe", "object", "embed"],
        FORBID_ATTR: ["onerror", "onload", "onclick", "onfocus", "onmouseover"]
    });

    modal.style.display = "block";
}

closeModal.onclick = () => {
    modal.style.display = "none";
};

window.addEventListener("click", e => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

/* ================== EVENTOS ================== */
categoriaSelect.addEventListener("change", e => {
    filtroCategoria = e.target.value;
    aplicarFiltrosYBusqueda();
});

sortSelect.addEventListener("change", e => {
    criterioOrden = e.target.value;
    aplicarFiltrosYBusqueda();
});

searchBar.addEventListener(
    "input",
    debounce(() => aplicarFiltrosYBusqueda(), 300)
);

document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchBar.focus();
    }
});

/* Admin */
btnAdmin.addEventListener("click", () => {
    window.location.href = "admin.html";
});

/* ================== MODO OSCURO ================== */
const themeBtn = document.getElementById("themeToggle");

themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    themeBtn.textContent = isDark ? "Modo claro" : "Modo oscuro";
    localStorage.setItem("fe_dark_mode", isDark ? "1" : "0");
});

// Estado persistente
if (localStorage.getItem("fe_dark_mode") === "1") {
    document.body.classList.add("dark");
    themeBtn.textContent = "Modo claro";
}

/* ================== INICIO ================== */
cargarArticulos();
