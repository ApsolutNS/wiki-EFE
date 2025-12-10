import { db } from "./firebase-config.js";
import { protegerVista, logoutAdmin, getCurrentUser } from "./admin-auth.js";
import { registrarLog } from "./logs.js";
import { 
    collection, getDocs, addDoc, setDoc, doc, deleteDoc, getDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ============================
   PROTEGER PANEL
============================ */
protegerVista(() => {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("panel").style.display = "block";
});

/* ============================
   QUILL EDITOR
============================ */
let quill;
window.addEventListener("DOMContentLoaded", () => {
    quill = new Quill("#editor", { theme: "snow" });
});

/* ============================
   TABLA
============================ */
const colArticulos = collection(db, "articulos");

async function cargarArticulos() {
    const snap = await getDocs(colArticulos);
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTabla(lista);
}

/* ============================
   CREAR / EDITAR ARTÍCULO
============================ */
async function guardarArticulo() {
    const id = document.getElementById("articuloId").value;
    const data = {
        titulo: document.getElementById("titulo").value.trim(),
        categoria: document.getElementById("categoria").value.trim(),
        resumen: document.getElementById("resumen").value.trim(),
        contenido: quill.root.innerHTML,
        visibleAgentes: document.getElementById("visibleAgentes").value === "true",
        destacado: document.getElementById("destacado").value === "true",
        updatedAt: serverTimestamp()
    };

    if (!id) {
        // crear
        const ref = await addDoc(colArticulos, {
            ...data,
            createdAt: serverTimestamp()
        });

        await registrarLog({
            accion: "create",
            articuloId: ref.id,
            usuario: getCurrentUser()
        });

        alert("Artículo creado");
    } else {
        // actualizar
        const ref = doc(db, "articulos", id);
        await setDoc(ref, data, { merge: true });

        await registrarLog({
            accion: "update",
            articuloId: id,
            usuario: getCurrentUser()
        });

        alert("Artículo actualizado");
    }

    cargarArticulos();
}

/* ============================
   ELIMINAR ARTÍCULO
============================ */
async function eliminarArticulo(id) {
    if (!confirm("¿Eliminar artículo?")) return;

    await deleteDoc(doc(db, "articulos", id));

    await registrarLog({
        accion: "delete",
        articuloId: id,
        usuario: getCurrentUser()
    });

    alert("Artículo eliminado");
    cargarArticulos();
}

/* ============================
   EXPORTAR INTERACCIONES
============================ */
window.guardarArticulo = guardarArticulo;
window.eliminarArticulo = eliminarArticulo;

cargarArticulos();
