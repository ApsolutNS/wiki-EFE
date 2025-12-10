/* ============================================================
   ADMIN.JS — Panel FE con Firebase Auth + Firestore + Quill
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

/* DOM */
const loginScreen = document.getElementById("loginScreen");
const panel = document.getElementById("panel");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");

const titulo = document.getElementById("titulo");
const categoria = document.getElementById("categoria");
const resumen = document.getElementById("resumen");
const visibleAgentes = document.getElementById("visibleAgentes");
const destacado = document.getElementById("destacado");
const articuloId = document.getElementById("articuloId");

const searchTabla = document.getElementById("searchTabla");
const tablaArticulos = document.getElementById("tablaArticulos");

const btnNuevo = document.getElementById("btnNuevo");
const btnGuardar = document.getElementById("btnGuardar");

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalContent = document.getElementById("modalContent");
const closeModal = document.getElementById("closeModal");

let quill;

/* Inicializar Quill */
document.addEventListener("DOMContentLoaded", () => {
    quill = new Quill("#editor", {
        theme: "snow",
        placeholder: "Escribe el contenido…"
    });

    cargarArticulos();
});

/* LOGIN */
loginBtn.onclick = async () => {
    const email = document.getElementById("loginUser").value.trim();
    const pass = document.getElementById("loginPass").value.trim();

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        loginError.style.display = "none";
    } catch {
        loginError.style.display = "block";
    }
};

/* Estado Login */
onAuthStateChanged(auth, user => {
    if (user) {
        loginScreen.style.display = "none";
        panel.style.display = "block";
    } else {
        panel.style.display = "none";
        loginScreen.style.display = "flex";
    }
});

/* Logout */
logoutBtn.onclick = () => signOut(auth);

/* ============================================================
   CARGAR ARTÍCULOS
============================================================ */
let articulosCache = [];

async function cargarArticulos() {
    const snap = await getDocs(collection(db, "articulos"));
    articulosCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTabla(articulosCache);
}

/* TABLA */
function renderTabla(lista) {
    tablaArticulos.innerHTML = lista.map(a => {
        const fecha = a.fecha?.toDate?.().toLocaleDateString("es-PE") || "-";
        return `
        <tr>
            <td>${a.titulo}</td>
            <td>${a.categoria}</td>
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

    tablaArticulos.querySelectorAll("[data-edit]")
        .forEach(btn => btn.onclick = () => editarArticulo(btn.dataset.edit));

    tablaArticulos.querySelectorAll("[data-view]")
        .forEach(btn => btn.onclick = () => verArticulo(btn.dataset.view));

    tablaArticulos.querySelectorAll("[data-del]")
        .forEach(btn => btn.onclick = () => eliminarArticulo(btn.dataset.del));
}

/* MODAL */
function verArticulo(id) {
    const a = articulosCache.find(x => x.id === id);
    modalTitle.textContent = a.titulo;
    modalContent.innerHTML = a.contenido;
    modal.style.display = "flex";
}
closeModal.onclick = () => modal.style.display = "none";

/* EDITAR */
async function editarArticulo(id) {
    const snap = await getDoc(doc(db, "articulos", id));
    if (!snap.exists()) return;

    const a = snap.data();
    articuloId.value = id;
    titulo.value = a.titulo;
    categoria.value = a.categoria;
    resumen.value = a.resumen;
    visibleAgentes.value = a.visibleAgentes ? "true" : "false";
    destacado.value = a.destacado ? "true" : "false";

    quill.root.innerHTML = a.contenido || "";

    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* NUEVO */
btnNuevo.onclick = () => {
    articuloId.value = "";
    titulo.value = "";
    categoria.value = "";
    resumen.value = "";
    visibleAgentes.value = "true";
    destacado.value = "false";
    quill.root.innerHTML = "";
};

/* GUARDAR */
btnGuardar.onclick = async () => {
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

    if (!data.titulo || !data.categoria || !data.resumen)
        return alert("Completa todos los campos.");

    if (articuloId.value) {
        await updateDoc(doc(db, "articulos", articuloId.value), data);
        alert("Artículo actualizado.");
    } else {
        await addDoc(collection(db, "articulos"), data);
        alert("Artículo creado.");
    }

    cargarArticulos();
};

/* ELIMINAR */
async function eliminarArticulo(id) {
    if (!confirm("¿Eliminar?")) return;
    await deleteDoc(doc(db, "articulos", id));
    cargarArticulos();
}

/* BUSCADOR */
searchTabla.oninput = () => {
    const q = searchTabla.value.toLowerCase();
    const filtrados = articulosCache.filter(a =>
        a.titulo.toLowerCase().includes(q) ||
        a.categoria.toLowerCase().includes(q)
    );
    renderTabla(filtrados);
};
