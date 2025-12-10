/* ============================================================
   ADMIN.JS – Funcional con Quill Local + CSP Compatible
   ============================================================ */

import { db } from "./firebase-config.js";
import { registrarLog } from "./logs.js";
import { sha256 } from "./utils.js";
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

/* ================================
   VARIABLES
   ================================ */
let articulosCache = [];
let quill;

const colArticulos = collection(db, "articulos");

/* ================================
   LOGIN
   ================================ */
function mostrarPanel() {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("panel").style.display = "block";
}

const sesion = getCurrentUser();
if (sesion) mostrarPanel();

document.getElementById("loginBtn").onclick = async () => {
    const user = loginUser.value.trim();
    const pass = loginPass.value.trim();
    const errBox = loginError;

    if (!user || !pass) {
        errBox.textContent = "Complete usuario y contraseña.";
        errBox.style.display = "block";
        return;
    }

    const ok = await intentarLogin(user, pass);
    if (!ok) {
        errBox.textContent = "Credenciales incorrectas.";
        errBox.style.display = "block";
        return;
    }

    errBox.style.display = "none";
    mostrarPanel();

    registrarLog({
        articuloId: null,
        accion: "login",
        antes: null,
        despues: { usuario: user },
        usuarioEmail: user
    });
};

/* ================================
   OVERLAY DE CARGA
   ================================ */
function setLoading(show, text = "Procesando…") {
    loadingText.textContent = text;
    loadingOverlay.style.display = show ? "flex" : "none";
}

/* ================================
   CARGAR TABLA PRINCIPAL
   ================================ */
async function cargarTabla() {
    const tbody = document.getElementById("tablaArticulos");
    try {
        setLoading(true, "Cargando artículos…");

        const snap = await getDocs(colArticulos);
        articulosCache = snap.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));

        articulosCache.sort((a, b) => {
            const fa = a.fecha?.toDate?.() || 0;
            const fb = b.fecha?.toDate?.() || 0;
            return fb - fa;
        });

        renderTabla(articulosCache);
    } catch (err) {
        alert("Error cargando artículos: " + err.message);
    } finally {
        setLoading(false);
    }
}

/* ================================
   TABLA + DASHBOARD
   ================================ */
function renderTabla(lista) {
    const tbody = document.getElementById("tablaArticulos");

    if (!lista.length) {
        tbody.innerHTML = "<tr><td colspan='6'>Sin artículos registrados.</td></tr>";
        return;
    }

    tbody.innerHTML = lista
        .map(a => `
            <tr>
                <td>${a.titulo}</td>
                <td>${a.categoria}</td>
                <td>${a.visibleAgentes ? "Sí" : "No"}</td>
                <td>${a.destacado ? "⭐" : "—"}</td>
                <td>${a.fecha ? a.fecha.toDate().toLocaleDateString("es-PE") : "-"}</td>
                <td>
                    <button class="btn-xs btn-ver" data-id="${a.id}">Ver</button>
                    <button class="btn-xs primary btn-editar" data-id="${a.id}">Editar</button>
                    <button class="btn-xs danger btn-eliminar" data-id="${a.id}">Eliminar</button>
                </td>
            </tr>
        `)
        .join("");

    tbody.querySelectorAll(".btn-ver").forEach(b =>
        b.onclick = () => verArticulo(b.dataset.id)
    );
    tbody.querySelectorAll(".btn-editar").forEach(b =>
        b.onclick = () => editarArticulo(b.dataset.id)
    );
    tbody.querySelectorAll(".btn-eliminar").forEach(b =>
        b.onclick = () => eliminarArticulo(b.dataset.id)
    );
}

/* ================================
   VER ARTÍCULO
   ================================ */
function verArticulo(id) {
    const art = articulosCache.find(a => a.id === id);
    if (!art) return alert("No existe el artículo.");

    modalTitle.textContent = art.titulo;
    modalCategory.textContent = art.categoria;
    modalContent.innerHTML = art.contenido || "";

    modal.style.display = "block";
}
closeModal.onclick = () => (modal.style.display = "none");

/* ================================
   EDITAR ARTÍCULO
   ================================ */
async function editarArticulo(id) {
    const ref = doc(db, "articulos", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return alert("Artículo no encontrado");

    const art = snap.data();

    articuloId.value = id;
    titulo.value = art.titulo;
    categoria.value = art.categoria;
    resumen.value = art.resumen;
    visibleAgentes.value = art.visibleAgentes ? "true" : "false";
    destacado.value = art.destacado ? "true" : "false";

    quill.root.innerHTML = art.contenido || "";

    formTitle.textContent = "Editar artículo";
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

/* ================================
   ELIMINAR ARTÍCULO
   ================================ */
async function eliminarArticulo(id) {
    if (!confirm("¿Eliminar artículo?")) return;

    const ref = doc(db, "articulos", id);
    await deleteDoc(ref);

    registrarLog({
        articuloId: id,
        accion: "delete",
        antes: null,
        despues: null,
        usuarioEmail: getCurrentUser()?.username
    });

    alert("Artículo eliminado.");
    cargarTabla();
}

/* ================================
   GUARDAR ARTÍCULO
   ================================ */
async function guardarArticulo() {
    const id = articuloId.value.trim();

    const data = {
        titulo: titulo.value,
        categoria: categoria.value,
        resumen: resumen.value,
        contenido: quill.root.innerHTML,
        visibleAgentes: visibleAgentes.value === "true",
        destacado: destacado.value === "true",
        updatedAt: serverTimestamp(),
        fecha: serverTimestamp()
    };

    if (!data.titulo || !data.categoria || !data.resumen) {
        alert("Complete todos los campos.");
        return;
    }

    if (id) {
        const ref = doc(db, "articulos", id);
        await setDoc(ref, data, { merge: true });
        alert("Artículo actualizado");
    } else {
        await addDoc(colArticulos, data);
        alert("Artículo creado");
    }

    limpiarFormulario();
    cargarTabla();
}
btnGuardar.onclick = guardarArticulo;

/* ================================
   FORMULARIO
   ================================ */
function limpiarFormulario() {
    articuloId.value = "";
    titulo.value = "";
    categoria.value = "";
    resumen.value = "";
    visibleAgentes.value = "true";
    destacado.value = "false";
    quill.root.innerHTML = "";
    formTitle.textContent = "Nuevo artículo";
}
btnLimpiar.onclick = limpiarFormulario;

/* ================================
   INIT
   ================================ */
document.addEventListener("DOMContentLoaded", () => {
    quill = new Quill("#editor", {
        theme: "snow"
    });

    cargarTabla();
});
