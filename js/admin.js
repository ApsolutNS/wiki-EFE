// =============================
// IMPORTS
// =============================
import { db } from "./firebase-config.js";
import { registrarLog } from "./logs.js";
import { toDateSafe } from "./utils.js";

import {
    collection,
    getDocs,
    addDoc,
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// =============================
// CONSTANTES LOGIN LOCAL
// =============================
const USER = "Efectiv-Wiki";
const PASS = "Miwiki.efectiv-2025*";
const AUTH_FLAG = "efectiva_login_ok";
const AUTH_USER_KEY = "efectiva_login_user";

// =============================
// ESTADO GLOBAL
// =============================
let articulosCache = [];
let quill;

// =============================
// LOGIN
// =============================
function mostrarPanel() {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("panel").style.display = "block";
}

function obtenerUsuarioActual() {
    return localStorage.getItem(AUTH_USER_KEY) || "admin@desconocido";
}

function initLogin() {
    const loginBtn = document.getElementById("loginBtn");
    const loginUser = document.getElementById("loginUser");
    const loginPass = document.getElementById("loginPass");
    const loginError = document.getElementById("loginError");

    // ya logueado antes
    if (localStorage.getItem(AUTH_FLAG) === "1") {
        mostrarPanel();
    }

    function intentarLogin() {
        const u = loginUser.value.trim();
        const p = loginPass.value.trim();

        if (u === USER && p === PASS) {
            localStorage.setItem(AUTH_FLAG, "1");
            localStorage.setItem(AUTH_USER_KEY, u);
            loginError.style.display = "none";
            mostrarPanel();
        } else {
            loginError.style.display = "block";
        }
    }

    loginBtn.addEventListener("click", intentarLogin);

    loginPass.addEventListener("keyup", (e) => {
        if (e.key === "Enter") intentarLogin();
    });
}

// =============================
// OVERLAY CARGA
// =============================
function setLoading(show, text = "Procesando…") {
    const overlay = document.getElementById("loadingOverlay");
    const label = document.getElementById("loadingText");
    label.textContent = text;
    overlay.style.display = show ? "flex" : "none";
}

// =============================
// DASHBOARD + TABLA
// =============================
const colArticulos = collection(db, "articulos");

async function cargarTabla() {
    const tbody = document.getElementById("tablaArticulos");

    try {
        setLoading(true, "Cargando artículos…");
        tbody.innerHTML = "<tr><td colspan='6'>Cargando...</td></tr>";

        const snap = await getDocs(colArticulos);
        articulosCache = snap.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));

        // ordenar por fecha (más recientes primero)
        articulosCache.sort((a, b) => {
            const fa = a.fecha ? toDateSafe(a.fecha) : 0;
            const fb = b.fecha ? toDateSafe(b.fecha) : 0;
            return fb - fa;
        });

        renderTabla(articulosCache);
    } catch (e) {
        console.error(e);
        alert("Error cargando artículos: " + e.message);
    } finally {
        setLoading(false);
    }
}

function actualizarDashboard(lista) {
    const total = lista.length;
    const visibles = lista.filter(a => a.visibleAgentes).length;
    const destacados = lista.filter(a => a.destacado).length;

    document.getElementById("contadorArticulos").textContent = `${total} artículos`;
    document.getElementById("contadorVisibles").textContent = `${visibles} visibles`;
    document.getElementById("contadorDestacados").textContent = `${destacados} destacados`;

    const cats = {};
    lista.forEach(a => {
        const c = a.categoria || "Sin categoría";
        cats[c] = (cats[c] || 0) + 1;
    });

    const cont = document.getElementById("metricsCategorias");
    cont.innerHTML = Object.keys(cats).map(c =>
        `<span class="cat-pill">${c}: ${cats[c]}</span>`
    ).join("");
}

function renderTabla(lista) {
    const tbody = document.getElementById("tablaArticulos");
    actualizarDashboard(lista);

    if (!lista.length) {
        tbody.innerHTML = "<tr><td colspan='6'>Sin artículos registrados aún.</td></tr>";
        return;
    }

    const rows = lista.map(a => {
        const fechaStr = a.fecha
            ? toDateSafe(a.fecha).toLocaleDateString("es-PE")
            : "-";

        return `
        <tr>
            <td>${a.titulo || ""}</td>
            <td>${a.categoria || ""}</td>
            <td>${a.visibleAgentes ? "Sí" : "No"}</td>
            <td>${a.destacado ? "⭐" : "—"}</td>
            <td>${fechaStr}</td>
            <td>
                <div class="actions">
                    <button class="btn-xs btn-ver" data-id="${a.id}">Ver</button>
                    <button class="btn-xs primary btn-editar" data-id="${a.id}">Editar</button>
                    <button class="btn-xs danger btn-eliminar" data-id="${a.id}">Eliminar</button>
                </div>
            </td>
        </tr>`;
    }).join("");

    tbody.innerHTML = rows;

    // Eventos sin usar onclick inline (CSP friendly)
    tbody.querySelectorAll(".btn-ver").forEach(btn => {
        btn.addEventListener("click", () => verArticulo(btn.dataset.id));
    });
    tbody.querySelectorAll(".btn-editar").forEach(btn => {
        btn.addEventListener("click", () => editarArticulo(btn.dataset.id));
    });
    tbody.querySelectorAll(".btn-eliminar").forEach(btn => {
        btn.addEventListener("click", () => eliminarArticulo(btn.dataset.id));
    });
}

// =============================
// BUSCADOR EN TABLA
// =============================
function initBuscadorTabla() {
    const searchInput = document.getElementById("searchTabla");

    searchInput.addEventListener("input", e => {
        const q = e.target.value.trim().toLowerCase();
        if (!q) {
            renderTabla(articulosCache);
            return;
        }

        const filtrados = articulosCache.filter(a => {
            const t = (a.titulo || "").toLowerCase();
            const r = (a.resumen || "").toLowerCase();
            const c = (a.categoria || "").toLowerCase();
            return t.includes(q) || r.includes(q) || c.includes(q);
        });

        renderTabla(filtrados);
    });
}

// =============================
// FORMULARIO
// =============================
function limpiarFormulario() {
    document.getElementById("articuloId").value = "";
    document.getElementById("titulo").value = "";
    document.getElementById("categoria").value = "";
    document.getElementById("resumen").value = "";
    document.getElementById("visibleAgentes").value = "true";
    document.getElementById("destacado").value = "false";
    if (quill) quill.root.innerHTML = "";
    document.getElementById("formTitle").textContent = "Nuevo artículo";
}

async function guardarArticuloHandler() {
    const id = document.getElementById("articuloId").value.trim();
    const titulo = document.getElementById("titulo").value.trim();
    const categoria = document.getElementById("categoria").value;
    const resumen = document.getElementById("resumen").value.trim();
    const visibleAgentes = document.getElementById("visibleAgentes").value === "true";
    const destacado = document.getElementById("destacado").value === "true";
    const contenido = quill ? quill.root.innerHTML : "";

    if (!titulo || !categoria || !resumen) {
        alert("Completa título, categoría y resumen.");
        return;
    }

    const usuarioEmail = obtenerUsuarioActual();

    const dataBase = {
        titulo,
        categoria,
        resumen,
        contenido,
        visibleAgentes,
        destacado
    };

    try {
        const esEdicion = !!id;

        if (esEdicion) {
            await actualizarArticulo(id, dataBase, usuarioEmail);
        } else {
            await crearArticulo(dataBase, usuarioEmail);
        }

        limpiarFormulario();
        await cargarTabla();

    } catch (e) {
        console.error(e);
        alert("Error al guardar: " + e.message);
    } finally {
        setLoading(false);
    }
}

// =============================
// CREAR / ACTUALIZAR / ELIMINAR + LOGS
// =============================
async function crearArticulo(dataBase, usuarioEmail) {
    setLoading(true, "Guardando artículo…");

    const dataConMeta = {
        ...dataBase,
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        fecha: serverTimestamp()
    };

    const docRef = await addDoc(colArticulos, dataConMeta);

    await registrarLog({
        articuloId: docRef.id,
        accion: "create",
        antes: null,
        despues: dataConMeta,
        usuarioEmail
    });

    alert("Artículo creado.");
}

async function actualizarArticulo(id, dataBase, usuarioEmail) {
    setLoading(true, "Actualizando artículo…");

    const ref = doc(db, "articulos", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        alert("El artículo ya no existe.");
        return;
    }

    const anterior = snap.data();
    const nuevaVersion = (anterior.version || 0) + 1;

    const dataConMeta = {
        ...dataBase,
        version: nuevaVersion,
        updatedAt: serverTimestamp(),
        fecha: serverTimestamp()
        // createdAt se mantiene como está en Firestore (por merge)
    };

    await setDoc(ref, dataConMeta, { merge: true });

    await registrarLog({
        articuloId: id,
        accion: "update",
        antes: anterior,
        despues: dataConMeta,
        usuarioEmail
    });

    alert("Artículo actualizado.");
}

async function eliminarArticulo(id) {
    if (!confirm("¿Eliminar este artículo?")) return;

    const usuarioEmail = obtenerUsuarioActual();
    setLoading(true, "Eliminando artículo…");

    const ref = doc(db, "articulos", id);
    const snap = await getDoc(ref);
    const anterior = snap.exists() ? snap.data() : null;

    await deleteDoc(ref);

    await registrarLog({
        articuloId: id,
        accion: "delete",
        antes: anterior,
        despues: null,
        usuarioEmail
    });

    alert("Artículo eliminado.");
    await cargarTabla();
}

// =============================
// VER / PREVIEW
// =============================
function verArticulo(id) {
    const a = articulosCache.find(x => x.id === id);
    if (!a) return;

    const modalTitle = document.getElementById("modalTitle");
    const modalMeta = document.getElementById("modalMeta");
    const modalContent = document.getElementById("modalContent");
    const modal = document.getElementById("modal");
    const btnCopiar = document.getElementById("btnCopiar");

    modalTitle.textContent = a.titulo || "";

    const fechaStr = a.fecha
        ? toDateSafe(a.fecha).toLocaleString("es-PE")
        : "";

    modalMeta.textContent =
        (a.categoria || "") + (fechaStr ? " · " + fechaStr : "");

    modalContent.innerHTML = a.contenido || "";
    modal.style.display = "block";

    btnCopiar.onclick = async () => {
        const tmp = document.createElement("div");
        tmp.innerHTML = a.contenido || "";
        const textoPlano = tmp.innerText;
        await navigator.clipboard.writeText(textoPlano);
        alert("Contenido copiado al portapapeles.");
    };
}

// =============================
// EDITAR
// =============================
async function editarArticulo(id) {
    try {
        setLoading(true, "Cargando artículo para edición…");

        const ref = doc(db, "articulos", id);
        const s = await getDoc(ref);

        if (!s.exists()) {
            alert("No se encontró el artículo.");
            return;
        }

        const a = s.data();

        document.getElementById("articuloId").value = id;
        document.getElementById("titulo").value = a.titulo || "";
        document.getElementById("categoria").value = a.categoria || "";
        document.getElementById("resumen").value = a.resumen || "";
        document.getElementById("visibleAgentes").value = a.visibleAgentes ? "true" : "false";
        document.getElementById("destacado").value = a.destacado ? "true" : "false";

        if (quill) {
            quill.root.innerHTML = a.contenido || "";
        }

        document.getElementById("formTitle").textContent = "Editar artículo";

        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth"
        });

    } catch (e) {
        console.error(e);
        alert("Error al cargar para editar: " + e.message);
    } finally {
        setLoading(false);
    }
}

// =============================
// MODO OSCURO / CLARO
// =============================
function initThemeToggle() {
    const themeBtn = document.getElementById("themeToggle");
    const THEME_KEY = "fe_admin_theme";

    function applyTheme(theme) {
        if (theme === "dark") {
            document.body.classList.add("dark");
            themeBtn.textContent = "Modo claro";
        } else {
            document.body.classList.remove("dark");
            themeBtn.textContent = "Modo oscuro";
        }
    }

    const saved = localStorage.getItem(THEME_KEY) || "light";
    applyTheme(saved);

    themeBtn.addEventListener("click", () => {
        const next = document.body.classList.contains("dark") ? "light" : "dark";
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next);
    });
}

// =============================
// MODAL
// =============================
function initModal() {
    const modal = document.getElementById("modal");
    const btnCerrarModal = document.getElementById("btnCerrarModal");

    btnCerrarModal.addEventListener("click", () => {
        modal.style.display = "none";
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
}

// =============================
// INIT GENERAL
// =============================
document.addEventListener("DOMContentLoaded", () => {
    // Inicializar editor QUILL
    quill = new Quill("#editor", {
        theme: "snow",
        placeholder: "Escribe aquí el contenido completo del artículo…"
    });

    // Login
    initLogin();

    // Botones formulario
    document.getElementById("btnGuardar").addEventListener("click", guardarArticuloHandler);
    document.getElementById("btnLimpiar").addEventListener("click", limpiarFormulario);
    document.getElementById("btnNuevo").addEventListener("click", limpiarFormulario);

    // Buscador tabla
    initBuscadorTabla();

    // Modal
    initModal();

    // Tema
    initThemeToggle();

    // Cargar artículos
    cargarTabla();
});
