/* ============================================================
   ADMIN.JS — Panel FE usando Firebase Auth + Firestore + Quill
   Compatible 100% con CSP (sin inline JS)
   ============================================================ */

import { auth, db } from "./firebase-config.js";
import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ============================================================
   ELEMENTOS DOM
   ============================================================ */
const loginScreen      = document.getElementById("loginScreen");
const panel            = document.getElementById("panel");
const loginBtn         = document.getElementById("loginBtn");
const loginError       = document.getElementById("loginError");

const titulo           = document.getElementById("titulo");
const categoria        = document.getElementById("categoria");
const resumen          = document.getElementById("resumen");
const visibleAgentes   = document.getElementById("visibleAgentes");
const destacado        = document.getElementById("destacado");
const articuloId       = document.getElementById("articuloId");

const searchTabla      = document.getElementById("searchTabla");
const tablaArticulos   = document.getElementById("tablaArticulos");

const btnNuevo         = document.getElementById("btnNuevo");
const btnGuardar       = document.getElementById("btnGuardar");

const modal            = document.getElementById("modal");
const modalTitle       = document.getElementById("modalTitle");
const modalContent     = document.getElementById("modalContent");
const closeModal       = document.getElementById("closeModal");

const logoutBtn        = document.getElementById("logoutBtn");

/* ============================================================
   QUILL
   ============================================================ */
let quill;

document.addEventListener("DOMContentLoaded", () => {
    quill = new Quill("#editor", {
        theme: "snow",
        placeholder: "Escribe el contenido completo del artículo…"
    });

    // Solo carga artículos si ya hay usuario logueado
    onAuthStateChanged(auth, user => {
        if (user) cargarArticulos();
    });
});

/* ============================================================
   LOGIN
   ============================================================ */
loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("loginUser").value.trim();
    const pass  = document.getElementById("loginPass").value.trim();

    if (!email || !pass) {
        loginError.textContent = "Ingrese correo y contraseña.";
        loginError.style.display = "block";
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        loginError.style.display = "none";
    } catch (e) {
        console.error(e);
        loginError.textContent = "Credenciales incorrectas.";
        loginError.style.display = "block";
    }
});

/* ============================================================
   ESTADO DE AUTENTICACIÓN
   ============================================================ */
onAuthStateChanged(auth, user => {
    if (user) {
        loginScreen.style.display = "none";
        panel.style.display = "block";
    } else {
        loginScreen.style.display = "flex";
        panel.style.display = "none";
    }
});

/* ============================================================
   LOGOUT
   ============================================================ */
logoutBtn.addEventListener("click", () => {
    signOut(auth);
});

/* ============================================================
   CARGAR ARTÍCULOS
   ============================================================ */
let articulosCache = [];

async function cargarArticulos() {
    const snap = await getDocs(collection(db, "articulos"));

    articulosCache = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
    }));

    renderTabla(articulosCache);
}

/* ============================================================
   RENDER TABLA
   ============================================================ */
function renderTabla(lista) {
    tablaArticulos.innerHTML = lista.map(a => {
        const fecha = a.fecha?.toDate?.().toLocaleDateString("es-PE") || "-";

        return `
        <tr>
            <td>${escapeHTML(a.titulo)}</td>
            <td>${escapeHTML(a.categoria)}</td>
            <td>${a.visibleAgentes ? "Sí" : "No"}</td>
            <td>${a.destacado ? "⭐" : "—"}</td>
            <td>${fecha}</td>
            <td>
                <button class="btn-xs primary" data-edit="${a.id}">Editar</button>
                <button class="btn-xs" data-view="${a.id}">Ver</button>
                <button class="btn-xs danger" data-del="${a.id}">Eliminar</button>
            </td>
        </tr>`;
    }).join("");

    tablaArticulos.querySelectorAll("[data-edit]").forEach(b =>
        b.onclick = () => editarArticulo(b.dataset.edit)
    );
    tablaArticulos.querySelectorAll("[data-view]").forEach(b =>
        b.onclick = () => verArticulo(b.dataset.view)
    );
    tablaArticulos.querySelectorAll("[data-del]").forEach(b =>
        b.onclick = () => eliminarArticulo(b.dataset.del)
    );
}

/* ============================================================
   VER ARTÍCULO — Modal seguro con sanitización
   ============================================================ */
function verArticulo(id) {
    const art = articulosCache.find(a => a.id === id);
    if (!art) return;

    modalTitle.textContent = art.titulo;

    // Sanitizar contenido HTML para evitar XSS
    modalContent.innerHTML = DOMPurify.sanitize(art.contenido || "");

    modal.style.display = "flex";
}

closeModal.onclick = () => {
    modal.style.display = "none";
};

/* ============================================================
   EDITAR ARTÍCULO
   ============================================================ */
async function editarArticulo(id) {
    const ref = doc(db, "articulos", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        alert("Artículo no encontrado.");
        return;
    }

    const a = snap.data();

    articuloId.value     = id;
    titulo.value         = a.titulo;
    categoria.value      = a.categoria;
    resumen.value        = a.resumen;
    visibleAgentes.value = a.visibleAgentes ? "true" : "false";
    destacado.value      = a.destacado ? "true" : "false";
    quill.root.innerHTML = a.contenido || "";

    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ============================================================
   LIMPIAR FORMULARIO
   ============================================================ */
btnNuevo.onclick = limpiarFormulario;

function limpiarFormulario() {
    articuloId.value     = "";
    titulo.value         = "";
    categoria.value      = "";
    resumen.value        = "";
    visibleAgentes.value = "true";
    destacado.value      = "false";
    quill.root.innerHTML = "";
}

/* ============================================================
   CREAR / ACTUALIZAR
   ============================================================ */
btnGuardar.addEventListener("click", async () => {
    const data = {
        titulo: titulo.value.trim(),
        categoria: categoria.value.trim(),
        resumen: resumen.value.trim(),
        contenido: quill.root.innerHTML,
        visibleAgentes: visibleAgentes.value === "true",
        destacado: destacado.value === "true",
        fecha: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    if (!data.titulo || !data.categoria || !data.resumen) {
        alert("Completa todos los campos obligatorios.");
        return;
    }

    try {
        if (articuloId.value) {
            await updateDoc(doc(db, "articulos", articuloId.value), data);
            alert("Artículo actualizado.");
        } else {
            await addDoc(collection(db, "articulos"), {
                ...data,
                createdAt: serverTimestamp()
            });
            alert("Artículo creado.");
        }

        limpiarFormulario();
        cargarArticulos();

    } catch (e) {
        console.error(e);
        alert("Error al guardar: " + e.message);
    }
});

/* ============================================================
   ELIMINAR
   ============================================================ */
async function eliminarArticulo(id) {
    if (!confirm("¿Eliminar artículo?")) return;

    await deleteDoc(doc(db, "articulos", id));
    alert("Eliminado.");

    cargarArticulos();
}

/* ============================================================
   BUSCADOR
   ============================================================ */
searchTabla.addEventListener("input", () => {
    const q = searchTabla.value.trim().toLowerCase();

    const filtrados = articulosCache.filter(a =>
        (a.titulo || "").toLowerCase().includes(q) ||
        (a.categoria || "").toLowerCase().includes(q)
    );

    renderTabla(filtrados);
});

/* ============================================================
   FUNCIÓN DE SANITIZACIÓN SIMPLE PARA TEXTO
   ============================================================ */
function escapeHTML(str) {
    return (str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
