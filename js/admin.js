// ======================================================
// IMPORTS
// ======================================================
import { db } from "./firebase-config.js";
import { registrarLog } from "./logs.js";
import { toDateSafe } from "./utils.js";
import { intentarLogin, getCurrentUser, logout } from "./admin-auth.js";

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

// ======================================================
// ESTADO GLOBAL
// ======================================================
let articulosCache = [];
let quill;

const colArticulos = collection(db, "articulos");

// ======================================================
// LOGIN + CONTROL DE SESIÓN
// ======================================================

function mostrarPanel() {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("panel").style.display = "block";
}

function ocultarPanel() {
    document.getElementById("panel").style.display = "none";
    document.getElementById("loginScreen").style.display = "flex";
}

async function initLogin() {
    const btn = document.getElementById("loginBtn");
    const userInput = document.getElementById("loginUser");
    const passInput = document.getElementById("loginPass");
    const errorBox = document.getElementById("loginError");

    // Sesión previa
    const saved = getCurrentUser();
    if (saved) {
        mostrarPanel();
    }

    async function hacerLogin() {
        const u = userInput.value.trim();
        const p = passInput.value.trim();

        const result = await intentarLogin(u, p);

        if (!result) {
            errorBox.textContent = "Credenciales incorrectas";
            errorBox.style.display = "block";
            return;
        }

        errorBox.style.display = "none";
        mostrarPanel();

        // Registrar log de login
        await registrarLog({
            articuloId: null,
            accion: "login",
            antes: null,
            despues: { usuario: u },
            usuarioEmail: u
        });
    }

    btn.addEventListener("click", hacerLogin);
    passInput.addEventListener("keyup", e => {
        if (e.key === "Enter") hacerLogin();
    });
}

// ======================================================
// OVERLAY CARGA
// ======================================================
function setLoading(show, text = "Procesando…") {
    const overlay = document.getElementById("loadingOverlay");
    const label = document.getElementById("loadingText");
    label.textContent = text;
    overlay.style.display = show ? "flex" : "none";
}

// ======================================================
// CARGAR TABLA + DASHBOARD
// ======================================================
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

    document.getElementById("metricsCategorias").innerHTML =
        Object.keys(cats)
            .map(c => `<span class="cat-pill">${c}: ${cats[c]}</span>`)
            .join("");
}

function renderTabla(lista) {
    const tbody = document.getElementById("tablaArticulos");
    actualizarDashboard(lista);

    if (!lista.length) {
        tbody.innerHTML = "<tr><td colspan='6'>Sin artículos registrados aún.</td></tr>";
        return;
    }

    tbody.innerHTML = lista.map(a => {
        const fechaStr = a.fecha ? toDateSafe(a.fecha).toLocaleDateString("es-PE") : "-";

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
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll(".btn-ver").forEach(btn =>
        btn.addEventListener("click", () => verArticulo(btn.dataset.id))
    );
    tbody.querySelectorAll(".btn-editar").forEach(btn =>
        btn.addEventListener("click", () => editarArticulo(btn.dataset.id))
    );
    tbody.querySelectorAll(".btn-eliminar").forEach(btn =>
        btn.addEventListener("click", () => eliminarArticulo(btn.dataset.id))
    );
}

// ======================================================
// BUSCADOR
// ======================================================
function initBuscadorTabla() {
    const searchInput = document.getElementById("searchTabla");

    searchInput.addEventListener("input", e => {
        const q = e.target.value.trim().toLowerCase();
        if (!q) return renderTabla(articulosCache);

        const filtrados = articulosCache.filter(a => {
            const t = (a.titulo || "").toLowerCase();
            const r = (a.resumen || "").toLowerCase();
            const c = (a.categoria || "").toLowerCase();
            return t.includes(q) || r.includes(q) || c.includes(q);
        });

        renderTabla(filtrados);
    });
}

// ======================================================
// FORMULARIO
// ======================================================
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
    const contenido = quill.root.innerHTML;

    if (!titulo || !categoria || !resumen) {
        alert("Completa título, categoría y resumen.");
        return;
    }

    const user = getCurrentUser()?.username || "desconocido";

    const base = { titulo, categoria, resumen, contenido, visibleAgentes, destacado };

    try {
        if (id) {
            await actualizarArticulo(id, base, user);
        } else {
            await crearArticulo(base, user);
        }
        limpiarFormulario();
        cargarTabla();
    } catch (e) {
        console.error(e);
        alert("Error al guardar: " + e.message);
    }
}

// ======================================================
// CREAR / EDITAR / ELIMINAR + LOGS
// ======================================================
async function crearArticulo(data, usuarioEmail) {
    setLoading(true, "Guardando artículo…");

    const finalData = {
        ...data,
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        fecha: serverTimestamp()
    };

    const ref = await addDoc(colArticulos, finalData);

    await registrarLog({
        articuloId: ref.id,
        accion: "create",
        antes: null,
        despues: finalData,
        usuarioEmail
    });

    alert("Artículo creado.");
    setLoading(false);
}

async function actualizarArticulo(id, data, usuarioEmail) {
    setLoading(true, "Actualizando artículo…");

    const ref = doc(db, "articulos", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        alert("El artículo ya no existe.");
        return;
    }

    const anterior = snap.data();
    const nuevaVersion = (anterior.version || 0) + 1;

    const finalData = {
        ...data,
        version: nuevaVersion,
        updatedAt: serverTimestamp(),
        fecha: serverTimestamp()
    };

    await setDoc(ref, finalData, { merge: true });

    await registrarLog({
        articuloId: id,
        accion: "update",
        antes: anterior,
        despues: finalData,
        usuarioEmail
    });

    alert("Artículo actualizado.");
    setLoading(false);
}

async function eliminarArticulo(id) {
    if (!confirm("¿Eliminar este artículo?")) return;

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
        usuarioEmail: getCurrentUser()?.username
    });

    alert("Artículo eliminado.");
    cargarTabla();
    setLoading(false);
}

// ======================================================
// VER / EDITAR / MODAL
// ======================================================
function verArticulo(id) {
    const a = articulosCache.find(x => x.id === id);
    if (!a) return;

    document.getElementById("modalTitle").textContent = a.titulo || "";
    document.getElementById("modalMeta").textContent =
        `${a.categoria || ""} · ${toDateSafe(a.fecha).toLocaleString("es-PE")}`;
    document.getElementById("modalContent").innerHTML = a.contenido || "";

    document.getElementById("modal").style.display = "block";

    document.getElementById("btnCopiar").onclick = async () => {
        const tmp = document.createElement("div");
        tmp.innerHTML = a.contenido || "";
        await navigator.clipboard.writeText(tmp.innerText);
        alert("Contenido copiado.");
    };
}

async function editarArticulo(id) {
    const ref = doc(db, "articulos", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return alert("Artículo no encontrado");

    const a = snap.data();

    document.getElementById("articuloId").value = id;
    document.getElementById("titulo").value = a.titulo || "";
    document.getElementById("categoria").value = a.categoria || "";
    document.getElementById("resumen").value = a.resumen || "";
    document.getElementById("visibleAgentes").value = a.visibleAgentes ? "true" : "false";
    document.getElementById("destacado").value = a.destacado ? "true" : "false";

    quill.root.innerHTML = a.contenido || "";
    document.getElementById("formTitle").textContent = "Editar artículo";

    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

// ======================================================
// MODAL
// ======================================================
function initModal() {
    const modal = document.getElementById("modal");
    const close = document.getElementById("btnCerrarModal");

    close.addEventListener("click", () => modal.style.display = "none");
    modal.addEventListener("click", e => {
        if (e.target === modal) modal.style.display = "none";
    });
}

// ======================================================
// TEMA
// ======================================================
function initThemeToggle() {
    const btn = document.getElementById("themeToggle");
    const KEY = "fe_admin_theme";

    function apply(theme) {
        if (theme === "dark") {
            document.body.classList.add("dark");
            btn.textContent = "Modo claro";
        } else {
            document.body.classList.remove("dark");
            btn.textContent = "Modo oscuro";
        }
    }

    apply(localStorage.getItem(KEY) || "light");

    btn.addEventListener("click", () => {
        const next = document.body.classList.contains("dark") ? "light" : "dark";
        localStorage.setItem(KEY, next);
        apply(next);
    });
}

// ======================================================
// INIT GENERAL
// ======================================================
document.addEventListener("DOMContentLoaded", () => {

    // Editor
    quill = new Quill("#editor", {
        theme: "snow",
        placeholder: "Escribe aquí el contenido completo del artículo…"
    });

    // Login
    initLogin();

    // Formulario
    document.getElementById("btnGuardar").addEventListener("click", guardarArticuloHandler);
    document.getElementById("btnLimpiar").addEventListener("click", limpiarFormulario);
    document.getElementById("btnNuevo").addEventListener("click", limpiarFormulario);

    // Buscador
    initBuscadorTabla();

    // Modal
    initModal();

    // Tema
    initThemeToggle();

    // Cargar contenido
    cargarTabla();
});
