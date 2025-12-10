// =========================
// admin.js (FINAL AUTH + CRUD)
// =========================
import { db } from "./firebase-config.js";
import { getCurrentUser, logoutAdmin } from "./admin-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let quill;

/* ======================= LOGIN CHECK ======================= */
function verificarSesion() {
    if (!getCurrentUser()) {
        document.getElementById("panel").style.display = "none";
        document.getElementById("loginScreen").style.display = "flex";
    } else {
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("panel").style.display = "block";
        cargarTabla();
    }
}

verificarSesion();

/* ======================= LOGOUT ======================= */
document.getElementById("logoutBtn").addEventListener("click", async () => {
    await logoutAdmin();
    location.reload();
});

/* ======================= CRUD ======================= */
const colArt = collection(db, "articulos");

async function cargarTabla() {
    const tbody = document.getElementById("tablaArticulos");
    tbody.innerHTML = "<tr><td colspan='6'>Cargando...</td></tr>";

    const snap = await getDocs(colArt);

    const lista = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
    }));

    tbody.innerHTML = lista
        .map(
            a => `
        <tr>
            <td>${a.titulo}</td>
            <td>${a.categoria}</td>
            <td>${a.visibleAgentes ? "Sí" : "No"}</td>
            <td>${a.destacado ? "⭐" : "—"}</td>
            <td>${a.fecha?.toDate().toLocaleDateString("es-PE")}</td>
            <td>
                <button class="btn-xs primary" data-id="${a.id}" data-accion="editar">Editar</button>
                <button class="btn-xs danger" data-id="${a.id}" data-accion="eliminar">Eliminar</button>
            </td>
        </tr>`
        )
        .join("");

    tbody.querySelectorAll("button").forEach(btn => {
        const id = btn.dataset.id;
        const accion = btn.dataset.accion;

        if (accion === "editar") btn.onclick = () => editarArticulo(id);
        if (accion === "eliminar") btn.onclick = () => eliminarArticulo(id);
    });
}

async function guardarArticulo() {
    const id = document.getElementById("articuloId").value;
    const data = {
        titulo: document.getElementById("titulo").value,
        categoria: document.getElementById("categoria").value,
        resumen: document.getElementById("resumen").value,
        contenido: quill.root.innerHTML,
        visibleAgentes: document.getElementById("visibleAgentes").value === "true",
        destacado: document.getElementById("destacado").value === "true",
        fecha: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    if (!id) {
        await addDoc(colArt, data);
    } else {
        await setDoc(doc(db, "articulos", id), data, { merge: true });
    }

    alert("Guardado correctamente");
    limpiarFormulario();
    cargarTabla();
}

async function editarArticulo(id) {
    const ref = doc(db, "articulos", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const a = snap.data();

    document.getElementById("articuloId").value = id;
    document.getElementById("titulo").value = a.titulo;
    document.getElementById("categoria").value = a.categoria;
    document.getElementById("resumen").value = a.resumen;
    document.getElementById("visibleAgentes").value = a.visibleAgentes ? "true" : "false";
    document.getElementById("destacado").value = a.destacado ? "true" : "false";

    quill.root.innerHTML = a.contenido;
}

async function eliminarArticulo(id) {
    if (!confirm("¿Eliminar artículo?")) return;

    await deleteDoc(doc(db, "articulos", id));
    cargarTabla();
}

/* ======================= FORM ======================= */
function limpiarFormulario() {
    document.getElementById("articuloId").value = "";
    document.getElementById("titulo").value = "";
    document.getElementById("categoria").value = "";
    document.getElementById("resumen").value = "";
    quill.root.innerHTML = "";
}

document.getElementById("btnGuardar").onclick = guardarArticulo;
document.getElementById("btnNuevo").onclick = limpiarFormulario;

/* ======================= QUILL ======================= */
document.addEventListener("DOMContentLoaded", () => {
    quill = new Quill("#editor", { theme: "snow" });
});
