import { db } from "./firebase-config.js";
import { toDateSafe, normalizar, debounce } from "./utils.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* --- ELEMENTOS DOM --- */
const searchBar        = document.getElementById("searchBar");
const categoriaSelect  = document.getElementById("categoriaSelect");
const sortSelect       = document.getElementById("sortSelect");
const resultsEl        = document.getElementById("results");
const topEl            = document.getElementById("topResults");
const historyBox       = document.getElementById("historyBox");
const paginationEl     = document.getElementById("pagination");
const infoResultadosEl = document.getElementById("infoResultados");
const infoOrdenEl      = document.getElementById("infoOrden");
const btnAdmin         = document.getElementById("btnAdmin");

/* --- ESTADO --- */
let articulosAll = [];
let articulosFiltrados = [];
let paginaActual = 1;
const POR_PAGINA = 12;
let criterioOrden = "recientes";
let filtroCategoria = "todas";

/* ================== CARGAR ARTÍCULOS ================== */
async function cargarArticulos() {
    const snap = await getDocs(collection(db, "articulos"));

    articulosAll = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(a => a.visibleAgentes !== false);

    renderRecomendados();
    aplicarFiltrosYBusqueda();
}

function renderRecomendados() {
    const recomendados = [...articulosAll]
        .sort((a,b) => {
            const d = (b.destacado === true) - (a.destacado === true);
            return d !== 0 ? d : toDateSafe(b.fecha) - toDateSafe(a.fecha);
        })
        .slice(0,4);

    renderResults(recomendados, topEl);
}

/* ================== BUSQUEDA + FILTROS ================== */
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
            .sort((a,b) => b.score - a.score);
    }

    paginaActual = 1;
    renderPagina();
}

function ordenarLista(lista) {
    const arr = [...lista];

    if (criterioOrden === "vistas")
        return arr.sort((a,b) => (b.vistas||0) - (a.vistas||0));

    if (criterioOrden === "destacados")
        return arr.sort((a,b) =>
            (b.destacado === true) - (a.destacado === true)
            || toDateSafe(b.fecha) - toDateSafe(a.fecha)
        );

    return arr.sort((a,b) => toDateSafe(b.fecha) - toDateSafe(a.fecha));
}

/* ================== RENDER ================== */
function renderPagina() {
    const total = articulosFiltrados.length;

    if (total === 0) {
        resultsEl.innerHTML = "<p>No hay resultados.</p>";
        paginationEl.innerHTML = "";
        infoResultadosEl.textContent = "Mostrando 0 resultados.";
        return;
    }

    const totalPaginas = Math.ceil(total / POR_PAGINA);
    const inicio = (paginaActual - 1) * POR_PAGINA;
    const paginados = articulosFiltrados.slice(inicio, inicio + POR_PAGINA);

    renderResults(paginados, resultsEl);
    
    infoResultadosEl.textContent = `Mostrando ${inicio+1}–${Math.min(inicio+POR_PAGINA, total)} de ${total} artículos.`;

    renderPagination(totalPaginas);
}

function renderResults(items, target) {
    target.innerHTML = items.map(a => `
        <div class="card" data-id="${a.id}">
            <div class="card-title">${a.titulo}</div>
            <div class="card-meta-row">
                <div class="card-category">${a.categoria}</div>
            </div>
            <div class="card-resumen">${a.resumen}</div>
        </div>
    `).join("");

    [...target.querySelectorAll(".card")].forEach(card => {
        card.addEventListener("click", () => abrir(card.dataset.id));
    });
}

/* ================= MODAL ================= */
window.abrir = function(id) {
    const art = articulosAll.find(a => a.id === id);
    if (!art) return;

    document.getElementById("modalTitle").textContent = art.titulo;
    document.getElementById("modalCategory").textContent = art.categoria;
    document.getElementById("modalContent").innerHTML =
        DOMPurify.sanitize(art.contenido);

    document.getElementById("modal").style.display = "block";
};

document.getElementById("closeModal").onclick = () =>
    document.getElementById("modal").style.display = "none";


/* ================= EVENTOS ================= */
categoriaSelect.addEventListener("change", e => {
    filtroCategoria = e.target.value;
    aplicarFiltrosYBusqueda();
});

sortSelect.addEventListener("change", e => {
    criterioOrden = e.target.value;
    aplicarFiltrosYBusqueda();
});

searchBar.addEventListener("input", debounce(e => {
    aplicarFiltrosYBusqueda();
}, 300));

document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchBar.focus();
    }
});
// Nuevo evento para el botón "Panel Admin"
btnAdmin.addEventListener("click", () => {
    // ⚠️ Importante: Reemplaza 'admin.html' con la ruta real de tu panel
    window.location.href = admin.html; 
});

/* ================= INICIO ================= */
cargarArticulos();

