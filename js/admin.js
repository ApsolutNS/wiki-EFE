// ======================================================
// IMPORTS
// ======================================================
import { db } from "./firebase-config.js";
import { registrarLog } from "./logs.js";
import { toDateSafe } from "./utils.js";
import { intentarLogin, getCurrentUser } from "./admin-auth.js";

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
// VARIABLES
// ======================================================
let articulosCache = [];
let quill;

const colArticulos = collection(db, "articulos");


// ======================================================
// LOGIN
// ======================================================
function mostrarPanel() {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("panel").style.display = "block";
}

const usuarioSesion = getCurrentUser();
if (usuarioSesion) mostrarPanel();

document.getElementById("loginBtn").addEventListener("click", async () => {
    const user = document.getElementById("loginUser").value.trim();
    const pass = document.getElementById("loginPass").value.trim();
    const error = document.getElementById("loginError");

    if (!user || !pass) {
        error.textContent = "Complete usuario y contraseña.";
        error.style.display = "block";
        return;
    }

    const result = await intentarLogin(user, pass);

    if (!result) {
        error.style.display = "block";
        error.textContent = "Credenciales incorrectas.";
        return;
    }

    mostrarPanel();
    error.style.display = "none";

    await registrarLog({
        articuloId: null,
        accion: "login",
        antes: null,
        despues: { usuario: user },
        usuarioEmail: user
    });
});


// ======================================================
// LOADING OVERLAY
// ======================================================
function setLoading(show, text = "Procesando…") {
    const overlay = document.getElementById("loadingOverlay");
    const label = document.getElementById("loadingText");

    if (!overlay || !label) return;

    label.textContent = text;
    overlay.style.display = show ? "flex" : "none";
}


// ======================================================
// TABLA + DASHBOARD
// ======================================================
async function cargarTabla() {
    const tbody = document.getElementById("tablaArticulos");

    try {
        setLoading(true, "Cargando artículos…");
        tbody.innerHTML = "<tr><td colspan='6'>Cargando...</td></tr>";

        const snap = await getDocs(colArticulos);

        articulosCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        articulosCache.sort((a, b) => {
            const fa = a.fecha ? toDateSafe(a.fecha) : 0;
            const fb = b.fecha ? toDateSafe(b.fecha) : 0;
            return fb - fa;
        });

        renderTabla(articulosCache);

    } catch (err) {
        console.error(err);
        alert("Error cargando artículos: " + err.message);
    } finally {
        setLoading(false);
    }
}

function actualizarDashboard(lista) {
    document.getElementById("contadorArticulos").textContent = `${lista.length} artículos`;
    document.getElementById("contadorVisibles").textContent =
        `${lista.filter(a => a.visibleAgentes).length} visibles`;
    document.getElementById("contadorDestacados").textContent =
        `${lista.filter(a => a.destacado).length} destacados`;

    const cats = {};
    lista.forEach(a => {
        const c = a.categoria || "Sin categoría";
        cats[c] = (cats[c] || 0) + 1;
    });

    document.getElementById("metricsCategorias").innerHTML =
        Object.keys(cats).map(c => `<span class="cat-pill">${c}: ${cats[c]}</span>`).join("");
}

function renderTabla(lista) {
    const tbody = document.getElementById("tablaArticulos");
    actualizarDashboard(lista);

    if (!lista.length) {
        tbody.innerHTML = "<tr><td colspan='6'>Sin artículos registrados.</td></tr>";
        return;
    }

    tbody.innerHTML = lista.map(a => `
        <tr>
            <td>${a.titulo}</td>
            <td>${a.categoria}</td>
            <td>${a.visibleAgentes ? "Sí" : "No"}</td>
            <td>${a.destacado ? "⭐" : "—"}</td>
            <td>${a.fecha ? toDateSafe(a.fecha).toLocaleDateString("es-PE") : "-"}</td>
            <td>
                <div class="actions">
                    <button class="btn-xs btn-ver" data-id="${a.id}">Ver</button>
                    <button class="btn-xs primary btn-editar" data-id="${a.id}">Editar</button>
                    <button class="btn-xs danger btn-eliminar" data-id="${a.id}">Eliminar</button>
                </div>
            </td>
        </tr>
    `).join("");

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
// FUNCIONES VER / EDITAR / ELIMINAR
// ======================================================
function verArticulo(id) {
    const art = articulosCache.find(a => a.id === id);
    if (!art) return alert("Artículo no encontrado");

    document.getElementById("modalTitle").textContent = art.titulo;
    document.getElementById("modalMeta").textContent =
        `${art.categoria} • ${toDateSafe(art.fecha).toLocaleString("es-PE")}`;
    document.getElementById("modalContent").innerHTML = art.contenido;

    document.getElementById("modal").style.display = "block";

    document.getElementById("btnCopiar").onclick = async () => {
        const temp = document.createElement("div");
        temp.innerHTML = art.contenido;
        await navigator.clipboard.writeText(temp.innerText);
        alert("Contenido copiado.");
    };
}

async function editarArticulo(id) {
    const ref = doc(db, "articulos", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return alert("Artículo no disponible");

    const art = snap.data();

    document.getElementById("articuloId").value = id;
    document.getElementById("titulo").value = art.titulo;
    document.getElementById("categoria").value = art.categoria;
    document.getElementById("resumen").value = art.resumen;
    document.getElementById("visibleAgentes").value = art.visibleAgentes ? "true" : "false";
    document.getElementById("destacado").value = art.destacado ? "true" : "false";

    quill.root.innerHTML = art.contenido;

    document.getElementById("formTitle").textContent = "Editar artículo";
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

async function eliminarArticulo(id) {
    if (!confirm("¿Eliminar este artículo?")) return;

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

    alert("Eliminado correctamente");
    cargarTabla();
}


// ======================================================
// BUSCADOR
// ======================================================
function initBuscadorTabla() {
    document.getElementById("searchTabla").addEventListener("input", evt => {
        const q = evt.target.value.toLowerCase();

        if (!q) return renderTabla(articulosCache);

        const filtrados = articulosCache.filter(a =>
            (a.titulo || "").toLowerCase().includes(q) ||
            (a.resumen || "").toLowerCase().includes(q) ||
            (a.categoria || "").toLowerCase().includes(q)
        );

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
    quill.root.innerHTML = "";
    document.getElementById("formTitle").textContent = "Nuevo artículo";
}


// ======================================================
// CRUD
// ======================================================
async function guardarArticuloHandler() {
    const id = document.getElementById("articuloId").value.trim();

    const articulo = {
        titulo: document.getElementById("titulo").value,
        categoria: document.getElementById("categoria").value,
        resumen: document.getElementById("resumen").value,
        contenido: quill.root.innerHTML,
        visibleAgentes: document.getElementById("visibleAgentes").value === "true",
        destacado: document.getElementById("destacado").value === "true"
    };

    if (!articulo.titulo || !articulo.categoria || !articulo.resumen) {
        alert("Complete todos los campos obligatorios");
        return;
    }

    const usuarioEmail = getCurrentUser()?.username;

    if (id) {
        const ref = doc(db, "articulos", id);
        const snap = await getDoc(ref);

        const anterior = snap.exists() ? snap.data() : null;

        await setDoc(ref, {
            ...articulo,
            version: (anterior?.version || 0) + 1,
            updatedAt: serverTimestamp(),
            fecha: serverTimestamp()
        }, { merge: true });

        await registrarLog({
            articuloId: id,
            accion: "update",
            antes: anterior,
            despues: articulo,
            usuarioEmail
        });

        alert("Artículo actualizado");

    } else {
        const ref = await addDoc(colArticulos, {
            ...articulo,
            version: 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            fecha: serverTimestamp()
        });

        await registrarLog({
            articuloId: ref.id,
            accion: "create",
            antes: null,
            despues: articulo,
            usuarioEmail
        });

        alert("Artículo creado");
    }

    limpiarFormulario();
    cargarTabla();
}


// ======================================================
// MODAL
// ======================================================
function initModal() {
    const modal = document.getElementById("modal");

    document.getElementById("btnCerrarModal").onclick = () => {
        modal.style.display = "none";
    };

    modal.addEventListener("click", e => {
        if (e.target === modal) modal.style.display = "none";
    });
}


// ======================================================
// THEME
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
// INIT
// ======================================================
document.addEventListener("DOMContentLoaded", () => {

    quill = new Quill("#editor", { theme: "snow" });

    initBuscadorTabla();
    initModal();
    initThemeToggle();

    document.getElementById("btnGuardar").onclick = guardarArticuloHandler;
    document.getElementById("btnLimpiar").onclick = limpiarFormulario;
    document.getElementById("btnNuevo").onclick = limpiarFormulario;

    cargarTabla();
});
